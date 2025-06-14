from pymongo import MongoClient
from datetime import datetime
import random
import sys
import json

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

def calculate_interest_match(article_topic, article_subtopic, user_interests):
    """Calcule le pourcentage de correspondance avec les intérêts de l'utilisateur"""
    if not user_interests:
        return random.randint(40, 70)  # Score aléatoire si pas d'intérêts
    
    # Si le topic de l'article correspond à un intérêt de l'utilisateur
    if article_topic in user_interests:
        return random.randint(75, 95)  # Score élevé
    
    # Si le subtopic correspond à un intérêt
    if article_subtopic in user_interests:
        return random.randint(65, 85)  # Score moyen-élevé
    
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
            # Calculer le score de correspondance
            match_score = calculate_interest_match(
                article.get("topic", ""), 
                article.get("subtopic", ""), 
                user_interests
            )
            
            recommendation = {
                "_id": str(article["_id"]),
                "title": article.get("title", ""),
                "content": article.get("content", "")[:200] + "..." if len(article.get("content", "")) > 200 else article.get("content", ""),
                "topic": article.get("topic", ""),
                "subtopic": article.get("subtopic", ""),
                "author": article.get("author", "Anonyme"),
                "publishedDate": article.get("publishedDate", ""),
                "readTime": article.get("readTime", "5 min"),
                "satisfaction_score": match_score,
                "match_percentage": match_score,
                "recommendation_reason": get_recommendation_reason(
                    article.get("topic", ""), 
                    user_interests, 
                    match_score
                )
            }
            recommendations.append(recommendation)
        
        # Trier par score de satisfaction (décroissant)
        recommendations.sort(key=lambda x: x["satisfaction_score"], reverse=True)
        
        return recommendations
        
    except Exception as e:
        print(f"Erreur dans get_random_articles: {e}", file=sys.stderr)
        return []

def get_recommendation_reason(article_topic, user_interests, score):
    """Génère une raison pour la recommandation"""
    if score >= 80:
        return f"Correspond parfaitement à vos intérêts en {article_topic}"
    elif score >= 60:
        return f"Pourrait vous intéresser - Sujet: {article_topic}"
    else:
        return "Découvrez de nouveaux sujets"

def main():
    """Fonction principale appelée depuis Node.js"""
    try:
        user_id = sys.argv[1] if len(sys.argv) > 1 else None
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 6
        
        recommendations = get_random_articles(user_id, limit)
        print(json.dumps(recommendations, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"Erreur dans main: {e}", file=sys.stderr)
        print("[]")

if __name__ == "__main__":
    main()