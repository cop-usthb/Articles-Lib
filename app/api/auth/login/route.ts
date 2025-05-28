import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null
  
  try {
    const { email, password } = await request.json()

    console.log('Login attempt for email:', email) // Debug

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
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

    // Chercher l'utilisateur par email dans la collection userAR
    const normalizedEmail = email.toLowerCase().trim()
    console.log('Looking for user with email:', normalizedEmail) // Debug
    
    const user = await db.collection('userAR').findOne({ email: normalizedEmail })
    
    console.log('User found:', user ? 'YES' : 'NO') // Debug
    
    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    console.log('Password valid:', isValidPassword) // Debug
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Créer le token JWT
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    console.log('Token created for user:', user._id) // Debug

    // Préparer les données utilisateur (sans le mot de passe)
    const userData = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      interests: user.interests || [],
      likes: user.likes || [],
      favorites: user.favorites || [],
      createdAt: user.createdAt
    }

    const response = NextResponse.json({
      success: true,
      user: userData,
      message: 'Connexion réussie'
    })

    // Définir le cookie JWT
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: '/'
    })

    console.log('Login successful, cookie set') // Debug

    return response

  } catch (error) {
    console.error('Login error:', error)
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
