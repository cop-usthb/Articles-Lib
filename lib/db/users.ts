import clientPromise from "../mongodb"
import bcrypt from "bcryptjs"
import { MongoClient, ObjectId } from 'mongodb'

const DB_NAME = process.env.MONGODB_DB!

interface User {
  _id: string
  name: string
  email: string
  interests: string[]
  likes: string[]
  favorites: string[]
  createdAt: Date
}

export async function createUser(userData: Omit<User, "_id" | "createdAt" | "updatedAt">): Promise<UserResponse> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  const user = {
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await db.collection("userAR").insertOne(user)

  const { password, ...userResponse } = user
  return {
    ...userResponse,
    _id: result.insertedId.toString(),
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  const user = await db.collection("userAR").findOne({ email })
  if (!user) return null

  return {
    ...user,
    _id: user._id.toString(),
  } as User
}

export async function findUserById(userId: string): Promise<User | null> {
  let client: MongoClient | null = null
  
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db('Online_courses')
    // Utiliser la collection userAR
    const user = await db.collection('userAR').findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      return null
    }

    // Retourner les données utilisateur (sans le mot de passe)
    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      interests: user.interests || [],
      likes: user.likes || [],
      favorites: user.favorites || [],
      createdAt: user.createdAt
    }
  } catch (error) {
    console.error('Error finding user by ID:', error)
    return null
  } finally {
    if (client) {
      await client.close()
    }
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<UserResponse | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  const result = await db.collection("userAR").findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  )

  if (!result) return null

  const { password, ...userResponse } = result
  return {
    ...userResponse,
    _id: result._id.toString(),
  } as UserResponse
}

export async function updateUserInterests(userId: string, interests: string[]) {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const result = await db.collection("userAR").updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          interests: interests,
          updatedAt: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      throw new Error("Utilisateur non trouvé")
    }
    
    console.log(`Updated interests for user ${userId}:`, interests)
    return result
  } catch (error) {
    console.error("Error updating user interests:", error)
    throw error
  }
}
