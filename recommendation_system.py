import random
import json
import sys
from pymongo import MongoClient
from datetime import datetime

# Connexion à MongoDB
client = MongoClient("mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001")
db = client["Online_courses"]

def get_user_interests(user_id):
    """Récupère les centres d'intérêt de l'utilisateur"""
    try:
        from bson import ObjectId
        user = db.userAR.find_one({"_id": ObjectId(user_id)})
        return user.get("interests", []) if user else []
    except Exception as e:
        return []

def calculate_interest_match(article_topic, user_interests):
    """Calcule le pourcentage de correspondance avec les intérêts de l'utilisateur"""
    if not user_interests:
        return random.randint(40, 70)  # Score aléatoire si pas d'intérêts
    
    # Si le topic de l'article correspond à un intérêt de l'utilisateur
    if article_topic in user_interests:
        return random.randint(75, 95)  # Score élevé
    
    # Score moyen pour les autres topics
    return random.randint(30, 60)

def get_random_articles(user_id=None, limit=6):
    """Récupère des articles aléatoires avec des scores de recommandation"""
    try:
        # Récupérer les intérêts de l'utilisateur si connecté
        user_interests = get_user_interests(user_id) if user_id else []
        
        # Récupérer tous les articles
        all_articles = list(db.Articles.find())
        
        if not all_articles:
            return []
        
        # Sélectionner des articles aléatoires
        selected_articles = random.sample(all_articles, min(limit, len(all_articles)))
        
        recommendations = []
        for article in selected_articles:
            # Calculer le score de recommandation
            topic = article.get("topic", "")
            satisfaction_score = calculate_interest_match(topic, user_interests)
            
            # Ajouter des facteurs aléatoires pour rendre le score plus réaliste
            if article.get("abstract") and len(article.get("abstract", "")) > 200:
                satisfaction_score += random.randint(5, 10)
            
            if article.get("authors_parsed") and len(article.get("authors_parsed", [])) > 3:
                satisfaction_score += random.randint(2, 5)
            
            # Limiter le score à 100%
            satisfaction_score = min(satisfaction_score, 100)
            
            recommendations.append({
                "_id": str(article["_id"]),
                "id": article.get("id", ""),
                "title": article.get("title", ""),
                "abstract": article.get("abstract", "")[:200] + "..." if article.get("abstract", "") else "",
                "authors_parsed": article.get("authors_parsed", []),
                "topic": topic,
                "satisfaction_score": satisfaction_score,
                "recommendation_reason": get_recommendation_reason(topic, user_interests, satisfaction_score)
            })
        
        # Trier par score de satisfaction (décroissant)
        recommendations.sort(key=lambda x: x["satisfaction_score"], reverse=True)
        
        return recommendations
        
    except Exception as e:
        return []

def get_recommendation_reason(article_topic, user_interests, score):
    """Génère une raison pour la recommandation"""
    if score >= 80:
        if article_topic in user_interests:
            return f"Correspond a votre interet pour {article_topic}"
        else:
            return "Article tres populaire dans votre domaine"
    elif score >= 60:
        return "Article potentiellement interessant"
    else:
        return "Nouvelle decouverte recommandee"

def main():
    """Fonction principale appelée depuis Node.js"""
    try:
        # Récupérer l'ID utilisateur depuis les arguments
        user_id = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "null" else None
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 6
        
        recommendations = get_random_articles(user_id, limit)
        
        # Retourner les résultats en JSON
        result = {
            "success": True,
            "articles": recommendations,
            "timestamp": datetime.now().isoformat()
        }
        
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "articles": []
        }
        print(json.dumps(error_result, ensure_ascii=False))

if __name__ == "__main__":
    main()