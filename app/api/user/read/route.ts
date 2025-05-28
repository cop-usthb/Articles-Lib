import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"
import jwt from "jsonwebtoken"
import { updateUserProfilesAsync } from "@/lib/updateUserProfiles"

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null
  
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string }
    const { articleId } = await request.json()

    if (!articleId) {
      return NextResponse.json({ error: "ID d'article requis" }, { status: 400 })
    }

    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db('Online_courses')

    // Récupérer l'utilisateur
    const user = await db.collection('userAR').findOne({ 
      _id: new ObjectId(decoded.userId) 
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Vérifier si l'article est déjà dans la liste des articles lus
    const readArticles = user.read || []
    
    if (readArticles.includes(articleId)) {
      return NextResponse.json({
        message: "Article déjà marqué comme lu",
        alreadyRead: true
      })
    }

    // Ajouter l'article à la liste des articles lus
    const updatedReadArticles = [...readArticles, articleId]

    // Mettre à jour l'utilisateur
    const result = await db.collection('userAR').updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $set: { 
          read: updatedReadArticles,
          updatedAt: new Date()
        } 
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await db.collection('userAR').findOne({ 
      _id: new ObjectId(decoded.userId) 
    })

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = {
      _id: updatedUser!._id.toString(),
      name: updatedUser!.name,
      email: updatedUser!.email,
      interests: updatedUser!.interests || [],
      likes: updatedUser!.likes || [],
      favorites: updatedUser!.favorites || [],
      read: updatedUser!.read || [],
    }

    // Déclencher la mise à jour des profils utilisateurs en arrière-plan
    updateUserProfilesAsync('article_read')

    return NextResponse.json({
      user: userData,
      message: "Article marqué comme lu",
      alreadyRead: false
    })

  } catch (error) {
    console.error("Read article error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}