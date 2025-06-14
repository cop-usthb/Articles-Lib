import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'

// Fonction temporaire pour générer des recommandations sans Python
function generateMockRecommendations(articles: any[], userInterests: string[] = []) {
  // Sélectionner 6 articles aléatoires
  const shuffled = articles.sort(() => 0.5 - Math.random())
  const selected = shuffled.slice(0, 6)
  
  return selected.map(article => {
    // Calculer un score basé sur les intérêts de l'utilisateur
    const topic = article.topic || ''
    let score = Math.floor(Math.random() * 40) + 40 // Score entre 40-80
    
    if (userInterests.includes(topic)) {
      score += Math.floor(Math.random() * 20) + 10 // Bonus si l'intérêt correspond
    }
    
    score = Math.min(score, 95) // Limiter à 95% pour plus de réalisme
    
    return {
      _id: article._id.toString(),
      id: article.id || '',
      title: article.title || '',
      abstract: (article.abstract || '').substring(0, 200) + '...',
      authors_parsed: article.authors_parsed || [],
      topic: topic,
      satisfaction_score: score,
      recommendation_reason: getRecommendationReason(topic, userInterests, score)
    }
  })
}

function getRecommendationReason(topic: string, userInterests: string[], score: number) {
  if (score >= 80) {
    if (userInterests.includes(topic)) {
      return `Correspond à votre intérêt pour ${topic}`
    }
    return "Article très populaire dans votre domaine"
  } else if (score >= 60) {
    return "Article potentiellement intéressant"
  }
  return "Nouvelle découverte recommandée"
}

export async function GET(request: NextRequest) {
  let client: MongoClient | null = null
  
  try {
    // Récupérer l'utilisateur depuis le token JWT (optionnel)
    let userId: string | null = null
    let userInterests: string[] = []
    
    const token = request.cookies.get("token")?.value
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string }
        userId = decoded.userId
      } catch (error) {
        console.log('Token invalide, recommandations anonymes')
      }
    }

    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db('Online_courses')

    // Récupérer les intérêts de l'utilisateur si connecté
    if (userId) {
      try {
        const { ObjectId } = require('mongodb')
        const user = await db.collection('userAR').findOne({ _id: new ObjectId(userId) })
        userInterests = user?.interests || []
      } catch (error) {
        console.log('Erreur lors de la récupération des intérêts utilisateur:', error)
      }
    }

    // Récupérer tous les articles
    const articles = await db.collection('Articles').find({}).limit(50).toArray()
    
    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        message: 'Aucun article trouvé'
      })
    }

    // Générer des recommandations
    const recommendations = generateMockRecommendations(articles, userInterests)

    return NextResponse.json({
      success: true,
      articles: recommendations,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur API recommandations:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération des recommandations',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    if (client) {
      await client.close()
    }
  }
}
