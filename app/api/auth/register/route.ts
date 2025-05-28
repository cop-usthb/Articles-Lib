import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null
  
  try {
    const { name, email, password, interests } = await request.json()

    console.log('Registration attempt for email:', email) // Debug

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db('Online_courses')

    // Vérifier si l'utilisateur existe déjà dans la collection userAR
    const normalizedEmail = email.toLowerCase().trim()
    console.log('Checking for existing user with email:', normalizedEmail) // Debug
    
    const existingUser = await db.collection('userAR').findOne({ 
      email: normalizedEmail 
    })
    
    console.log('Existing user found:', existingUser ? 'YES' : 'NO') // Debug
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      interests: interests || [],
      likes: [],
      favorites: [],
      read: [], // Initialiser le champ read
      createdAt: new Date(),
    }

    console.log('Creating new user:', { ...newUser, password: '[REDACTED]' }) // Debug

    const result = await db.collection('userAR').insertOne(newUser)

    console.log('User created with ID:', result.insertedId) // Debug

    return NextResponse.json(
      { message: 'Utilisateur créé avec succès', userId: result.insertedId },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  } finally {
    if (client) {
      await client.close()
    }
  }
}
