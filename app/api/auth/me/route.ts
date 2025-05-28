import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"
import jwt from "jsonwebtoken"

function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  let client: MongoClient | null = null
  
  try {
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 })
    }

    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    client = new MongoClient(uri)
    await client.connect()
    const db = client.db('Online_courses')

    const user = await db.collection('userAR').findOne({ 
      _id: new ObjectId(decoded.userId) 
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      interests: user.interests || [],
      likes: user.likes || [],
      favorites: user.favorites || [],
      read: user.read || [], // Inclure le champ read
      createdAt: user.createdAt
    }

    return NextResponse.json({ user: userData })

  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}
