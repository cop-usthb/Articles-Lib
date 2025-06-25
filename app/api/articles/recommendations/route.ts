import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'
import { spawn } from 'child_process'

// Fonction pour exécuter le script Python recommendation_script.py
async function getPythonRecommendations(userId?: string, limit: number = 12): Promise<any> {
  return new Promise((resolve, reject) => {
    // 🔄 CORRECTION: Format d'arguments correct selon l'usage affiché
    const pythonArgs = [
      'recommendation_script.py',
      userId || 'anonymous',           // user_id (argument positionnel)
      'article',                       // domain (course ou article) - OBLIGATOIRE
      '--k', limit.toString(),         // Nombre de recommandations (option --k)
      '--verbose'                      // Mode verbose pour plus d'infos
    ];
    
    console.log('Exécution de recommendation_script.py avec les arguments:', pythonArgs);
    
    const pythonProcess = spawn('python', pythonArgs, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
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
        console.error('recommendation_script.py failed with code:', code);
        console.error('Error output:', errorString);
        reject(new Error(`recommendation_script.py failed: ${errorString}`));
        return;
      }
      
      try {
        // 🔧 AMÉLIORATION: Extraction JSON plus robuste
        console.log('Raw Python output:', dataString);
        
        // Diviser en lignes et chercher les lignes qui commencent par [ ou {
        const lines = dataString.split('\n');
        let jsonLines: string[] = [];
        let inJsonBlock = false;
        let bracketCount = 0;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Détecter le début d'un JSON array ou object
          if (!inJsonBlock && (trimmedLine.startsWith('[') || trimmedLine.startsWith('{'))) {
            inJsonBlock = true;
            bracketCount = 0;
            jsonLines = [line];
            
            // Compter les brackets/braces
            for (const char of trimmedLine) {
              if (char === '[' || char === '{') bracketCount++;
              if (char === ']' || char === '}') bracketCount--;
            }
            
            // Si c'est une ligne complète
            if (bracketCount === 0) {
              break;
            }
          } else if (inJsonBlock) {
            jsonLines.push(line);
            
            // Compter les brackets/braces
            for (const char of trimmedLine) {
              if (char === '[' || char === '{') bracketCount++;
              if (char === ']' || char === '}') bracketCount--;
            }
            
            // Si on a fermé tous les brackets/braces
            if (bracketCount === 0) {
              break;
            }
          }
        }
        
        if (jsonLines.length === 0) {
          throw new Error('No valid JSON found in Python output');
        }
        
        const jsonString = jsonLines.join('\n');
        console.log('Extracted JSON string:', jsonString);
        
        const jsonArray = JSON.parse(jsonString);
        
        // Transformer en format attendu
        const result = {
          success: true,
          recommendations: jsonArray,
          method: 'recommendation_script',
          user_id: userId || 'anonymous'
        };
        
        console.log('Résultat de recommendation_script.py (array):', result);
        resolve(result);
        
      } catch (error) {
        console.error('Failed to parse recommendation_script.py output:', dataString);
        console.error('Parse error:', error);
        reject(new Error(`Failed to parse Python output: ${error}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start recommendation_script.py: ${error.message}`));
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
    
    // 🔧 AMÉLIORATION: Recherche par ID string et ObjectId
    const validObjectIds = articleIds.map(id => {
      try { return new ObjectId(id); } 
      catch { return null; }
    }).filter((id): id is ObjectId => id !== null);

    const articles = await db.collection('Articles')
      .find({ 
        $or: [
          { id: { $in: articleIds } },           // Recherche par champ 'id'
          { _id: { $in: validObjectIds } }       // Recherche par ObjectId valides uniquement
        ]
      })
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
    console.log('=== Début API Recommandations (recommendation_script.py) ===');
    
    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    
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

    // 🔄 CHANGEMENT: Appel du nouveau script recommendation_script.py
    console.log('Appel de recommendation_script.py...');
    const pythonResult = await getPythonRecommendations(userId || undefined, limit);
    
    // 🔄 ADAPTATION: Format de réponse différent selon le nouveau script
    if (!pythonResult || (pythonResult.status && pythonResult.status === 'error')) {
      throw new Error(pythonResult?.message || 'Erreur du script recommendation_script.py');
    }

    console.log('Résultats recommendation_script.py:', {
      status: pythonResult.status || 'success',
      count: pythonResult.recommendations?.length || 0,
      method: pythonResult.method || 'unknown',
      user_id: pythonResult.user_id
    });

    // 🔄 ADAPTATION: Extraction des IDs selon le nouveau format
    let articleIds = [];
    if (pythonResult.recommendations && Array.isArray(pythonResult.recommendations)) {
      articleIds = pythonResult.recommendations.map((rec: any) => {
        // Si le script retourne des objets avec id et score
        if (typeof rec === 'object' && rec.id) {
          return rec.id;
        }
        // Si le script retourne directement des IDs
        if (typeof rec === 'string') {
          return rec;
        }
        return rec.toString();
      });
    }
    
    console.log('IDs des articles à récupérer:', articleIds.slice(0, 3), '...');
    
    if (articleIds.length === 0) {
      console.log('Aucun ID d\'article reçu du script Python, utilisation du fallback');
      throw new Error('Aucune recommandation reçue du script Python');
    }
    
    const articles = await getArticlesByIds(articleIds);
    console.log('Articles récupérés depuis MongoDB:', articles.length);

    // 🔄 ADAPTATION: Combiner les articles avec leurs scores du nouveau script
    const recommendedArticles = articles.map(article => {
      const recommendation = pythonResult.recommendations?.find(
        (rec: any) => {
          const recId = typeof rec === 'object' ? rec.id : rec.toString();
          return recId === article.id || recId === article._id.toString();
        }
      );
      
      // 🔧 AMÉLIORATION: Conversion score en pourcentage
      let rawScore = recommendation?.score || 0;
      
      // Si le score est entre -1 et 1, le convertir en pourcentage
      if (rawScore >= -1 && rawScore <= 1) {
        // Normaliser de [-1, 1] vers [30, 95]
        rawScore = ((rawScore + 1) / 2) * 65 + 30;
      } else if (rawScore < 30) {
        // Si le score est très bas, l'ajuster
        rawScore = Math.max(30, rawScore * 100);
      }
      
      const score = Math.min(95, Math.max(30, Math.round(rawScore)));
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
          pythonResult.user_interests || pythonResult.interests || [], 
          score
        )
      };
    });

    console.log('Articles formatés:', recommendedArticles.length);
    console.log('=== Fin API Recommandations (recommendation_script.py) ===');

    return NextResponse.json({
      success: true,
      articles: recommendedArticles,
      metadata: {
        user_interests: pythonResult.user_interests || pythonResult.interests || [],
        total_articles_analyzed: pythonResult.total_articles || 0,
        recommendation_method: pythonResult.method || 'recommendation_script',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('=== ERREUR API Recommandations (recommendation_script.py) ===');
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
