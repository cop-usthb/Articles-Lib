import clientPromise from "../mongodb"

const DB_NAME = process.env.MONGODB_DB!

export async function getArticles(
  page = 1,
  limit = 20,
  search?: string,
  category?: string,
): Promise<{ articles: Article[]; total: number }> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  const query: any = {}

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { abstract: { $regex: search, $options: "i" } },
      { "authors_parsed.0": { $regex: search, $options: "i" } },
      { "authors_parsed.1": { $regex: search, $options: "i" } },
      { submitter: { $regex: search, $options: "i" } },
      { keywords: { $in: [new RegExp(search, "i")] } },
    ]
  }

  if (category && category !== "Toutes") {
    query.topic = { $in: [category] }
  }

  const skip = (page - 1) * limit

  try {
    const [articles, total] = await Promise.all([
      db.collection("Articles").find(query).skip(skip).limit(limit).toArray(),
      db.collection("Articles").countDocuments(query),
    ])

    console.log(`Found ${total} articles in database`)

    return {
      articles: articles.map((article) => ({
        ...article,
        _id: article._id.toString(),
        // Ensure required fields have default values
        likes: article.likes || 0,
        satisfaction: article.satisfaction || 85 + Math.floor(Math.random() * 15), // Random satisfaction 85-100%
        publishDate: article.publishDate || new Date().toISOString().split("T")[0],
        readTime: article.readTime || `${Math.floor(Math.random() * 15) + 5} min`,
        // Handle arrays properly
        topic: Array.isArray(article.topic) ? article.topic : [article.topic].filter(Boolean),
        subtopic: Array.isArray(article.subtopic) ? article.subtopic : [article.subtopic].filter(Boolean),
        keywords: Array.isArray(article.keywords) ? article.keywords : [],
      })) as Article[],
      total,
    }
  } catch (error) {
    console.error("Error fetching articles from MongoDB:", error)
    return { articles: [], total: 0 }
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  try {
    const article = await db.collection("Articles").findOne({ id })
    if (!article) {
      console.log(`Article with id ${id} not found`)
      return null
    }

    return {
      ...article,
      _id: article._id.toString(),
      likes: article.likes || 0,
      satisfaction: article.satisfaction || 85 + Math.floor(Math.random() * 15),
      publishDate: article.publishDate || new Date().toISOString().split("T")[0],
      readTime: article.readTime || `${Math.floor(Math.random() * 15) + 5} min`,
      // Handle arrays properly
      topic: Array.isArray(article.topic) ? article.topic : [article.topic].filter(Boolean),
      subtopic: Array.isArray(article.subtopic) ? article.subtopic : [article.subtopic].filter(Boolean),
      keywords: Array.isArray(article.keywords) ? article.keywords : [],
    } as Article
  } catch (error) {
    console.error("Error fetching article from MongoDB:", error)
    return null
  }
}

export async function getArticlesByIds(ids: string[]): Promise<Article[]> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  try {
    const articles = await db
      .collection("Articles")
      .find({ id: { $in: ids } })
      .toArray()

    return articles.map((article) => ({
      ...article,
      _id: article._id.toString(),
      likes: article.likes || 0,
      satisfaction: article.satisfaction || 85 + Math.floor(Math.random() * 15),
      publishDate: article.publishDate || new Date().toISOString().split("T")[0],
      readTime: article.readTime || `${Math.floor(Math.random() * 15) + 5} min`,
      // Handle arrays properly
      topic: Array.isArray(article.topic) ? article.topic : [article.topic].filter(Boolean),
      subtopic: Array.isArray(article.subtopic) ? article.subtopic : [article.subtopic].filter(Boolean),
      keywords: Array.isArray(article.keywords) ? article.keywords : [],
    })) as Article[]
  } catch (error) {
    console.error("Error fetching articles by IDs from MongoDB:", error)
    return []
  }
}

export async function getRecommendedArticles(interests: string[], limit = 3): Promise<Article[]> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  try {
    const articles = await db
      .collection("Articles")
      .find({ topic: { $in: interests } })
      .limit(limit * 2)
      .toArray()

    // Shuffle and limit
    const shuffled = articles.sort(() => 0.5 - Math.random()).slice(0, limit)

    return shuffled.map((article) => ({
      ...article,
      _id: article._id.toString(),
      likes: article.likes || 0,
      satisfaction: article.satisfaction || 85 + Math.floor(Math.random() * 15),
      publishDate: article.publishDate || new Date().toISOString().split("T")[0],
      readTime: article.readTime || `${Math.floor(Math.random() * 15) + 5} min`,
      // Handle arrays properly
      topic: Array.isArray(article.topic) ? article.topic : [article.topic].filter(Boolean),
      subtopic: Array.isArray(article.subtopic) ? article.subtopic : [article.subtopic].filter(Boolean),
      keywords: Array.isArray(article.keywords) ? article.keywords : [],
    })) as Article[]
  } catch (error) {
    console.error("Error fetching recommended articles from MongoDB:", error)
    return []
  }
}

export async function getAllCategories(): Promise<string[]> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  try {
    // Since topic is now an array, we need to use aggregation to get unique values
    const pipeline = [{ $unwind: "$topic" }, { $group: { _id: "$topic" } }, { $sort: { _id: 1 } }]

    const result = await db.collection("Articles").aggregate(pipeline).toArray()
    const categories = result.map((item) => item._id).filter(Boolean)

    console.log("Found categories:", categories)
    return categories
  } catch (error) {
    console.error("Error fetching categories from MongoDB:", error)
    return []
  }
}

export async function getAvailableTopics(): Promise<string[]> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  try {
    // Utiliser la même logique que getAllCategories pour récupérer tous les topics uniques
    const pipeline = [
      { $unwind: "$topic" },
      { $group: { _id: "$topic" } },
      { $sort: { _id: 1 } }
    ]

    const result = await db.collection("Articles").aggregate(pipeline).toArray()
    const topics = result.map((item) => item._id).filter(Boolean)

    console.log("Found topics:", topics)
    return topics
  } catch (error) {
    console.error("Erreur lors de la récupération des topics:", error)
    throw error
  }
}
