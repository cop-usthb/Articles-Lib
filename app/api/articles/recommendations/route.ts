import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'
import { spawn } from 'child_process'

// Fonction pour exécuter le script Python
async function getPythonRecommendations(userId?: string, limit: number = 12): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonArgs = [
      'recommendation.py',
      userId || 'null',
      limit.toString()
    ];
    
    console.log('Exécution de Python avec les arguments:', pythonArgs);
    
    const pythonProcess = spawn('python', pythonArgs, {
      cwd: process.cwd()
    });
    
    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script failed with code:', code);
        console.error('Error output:', errorString);
        reject(new Error(`Python script failed: ${errorString}`));
        return;
      }
      
      try {
        const result = JSON.parse(dataString.trim());
        resolve(result);
      } catch (error) {
        console.error('Failed to parse Python output:', dataString);
        reject(new Error(`Failed to parse Python output: ${error}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// Fonction pour récupérer les articles complets depuis MongoDB
async function getArticlesByIds(articleIds: string[]) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('Online_courses');
    
    const objectIds = articleIds.map(id => new ObjectId(id));
    const articles = await db.collection('Articles')
      .find({ _id: { $in: objectIds } })
      .toArray();
      
    return articles;
  } finally {
    await client.close();
  }
}

// Fonction pour générer la raison de recommandation
function getRecommendationReason(topic: string | string[], userInterests: string[], score: number) {
  const topicArray = Array.isArray(topic) ? topic : [topic];
  const mainTopic = topicArray[0] || 'Science';
  
  if (score >= 80) {
    if (userInterests.some(interest => topicArray.includes(interest))) {
      return `Correspond parfaitement à votre intérêt pour ${mainTopic}`;
    }
    return `Article très populaire en ${mainTopic}`;
  } else if (score >= 60) {
    return `Article potentiellement intéressant en ${mainTopic}`;
  }
  return `Découvrez de nouveaux sujets en ${mainTopic}`;
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== Début API Recommandations ===');
    
    // Récupérer l'utilisateur depuis le token JWT (optionnel)
    let userId: string | null = null;
    
    const token = request.cookies.get("token")?.value;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
        userId = decoded.userId;
        console.log('Utilisateur connecté:', userId);
      } catch (error) {
        console.log('Token invalide, recommandations anonymes');
      }
    }

    // Appeler le script Python pour obtenir les IDs recommandés (12 articles)
    console.log('Appel du script Python...');
    const pythonResult = await getPythonRecommendations(userId, 12);
    
    if (!pythonResult.success) {
      throw new Error(pythonResult.error || 'Erreur du script Python');
    }

    console.log('Résultats Python:', {
      success: pythonResult.success,
      count: pythonResult.recommendations?.length || 0,
      userInterests: pythonResult.user_interests?.length || 0
    });

    // Récupérer les articles complets depuis MongoDB
    const articleIds = pythonResult.recommendations.map((rec: any) => rec.id);
    console.log('IDs des articles à récupérer:', articleIds.slice(0, 3), '...');
    
    const articles = await getArticlesByIds(articleIds);
    console.log('Articles récupérés depuis MongoDB:', articles.length);

    // Combiner les articles avec leurs scores
    const recommendedArticles = articles.map(article => {
      const recommendation = pythonResult.recommendations.find(
        (rec: any) => rec.id === article._id.toString()
      );
      
      const score = recommendation?.score || 50;
      const topicArray = Array.isArray(article.topic) ? article.topic : [article.topic].filter(Boolean);
      
      return {
        _id: article._id.toString(),
        id: article.id || '',
        title: article.title || 'Sans titre',
        abstract: (article.abstract || '').substring(0, 200) + '...',
        authors_parsed: article.authors_parsed || [],
        topic: topicArray,
        subtopic: Array.isArray(article.subtopic) ? article.subtopic : [article.subtopic].filter(Boolean),
        satisfaction_score: score,
        recommendation_reason: getRecommendationReason(
          topicArray, 
          pythonResult.user_interests || [], 
          score
        )
      };
    });

    console.log('Articles formatés:', recommendedArticles.length);
    console.log('=== Fin API Recommandations ===');

    return NextResponse.json({
      success: true,
      articles: recommendedArticles,
      metadata: {
        user_interests: pythonResult.user_interests || [],
        total_articles_analyzed: pythonResult.total_articles || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('=== ERREUR API Recommandations ===');
    console.error('Erreur:', error);
    
    // Fallback vers un système simple en cas d'erreur
    try {
      console.log('Tentative de fallback...');
      const fallbackResult = await getFallbackRecommendations();
      
      return NextResponse.json({
        success: true,
        articles: fallbackResult,
        fallback: true,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } catch (fallbackError) {
      console.error('Erreur du fallback:', fallbackError);
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Service de recommandation temporairement indisponible',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        },
        { status: 500 }
      );
    }
  }
}

// Fonction de fallback simple
async function getFallbackRecommendations() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not found');
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('Online_courses');
    
    // Récupérer 12 articles aléatoires
    const articles = await db.collection('Articles')
      .aggregate([{ $sample: { size: 12 } }])
      .toArray();
    
    return articles.map(article => ({
      _id: article._id.toString(),
      id: article.id || '',
      title: article.title || 'Sans titre',
      abstract: (article.abstract || '').substring(0, 200) + '...',
      authors_parsed: article.authors_parsed || [],
      topic: Array.isArray(article.topic) ? article.topic : [article.topic].filter(Boolean),
      subtopic: Array.isArray(article.subtopic) ? article.subtopic : [article.subtopic].filter(Boolean),
      satisfaction_score: Math.floor(Math.random() * 40) + 50,
      recommendation_reason: 'Sélection aléatoire'
    }));
    
  } finally {
    await client.close();
  }
}
