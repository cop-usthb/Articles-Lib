import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export async function GET(request: NextRequest) {
  let client: MongoClient | null = null
  
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db('Online_courses')
    const collection = db.collection('Articles')
    
    // Récupérer UNIQUEMENT les topics distincts (pas les subtopics)
    const distinctTopics = await collection.distinct('topic')
    
    // Nettoyer et trier les topics
    const cleanTopics = distinctTopics
      .filter(topic => topic && typeof topic === 'string' && topic.trim().length > 0)
      .map(topic => topic.trim())
      .sort()
    
    return NextResponse.json({ 
      success: true, 
      topics: cleanTopics
    })
  } catch (error) {
    console.error('Error fetching topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics', details: error.message },
      { status: 500 }
    )
  } finally {
    if (client) {
      await client.close()
    }
  }
}