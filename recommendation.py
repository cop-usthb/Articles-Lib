from pymongo import MongoClient
import json
import sys
import os
import pandas as pd
from datetime import datetime
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from bson import ObjectId
import argparse

# Connexion à MongoDB
client = MongoClient("mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001")
db = client["Online_courses"]

def log_message(message):
    """Affiche les messages de log sur stderr pour éviter d'interférer avec le JSON"""
    print(message, file=sys.stderr)

def get_user_interacted_articles(user_id):
    """Récupère les articles avec lesquels l'utilisateur a interagi (likes, favorites, read)"""
    try:
        client = MongoClient("mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001")
        db = client["Online_courses"]
        users_collection = db["userAR"]
        
        # Convertir l'user_id en ObjectId si c'est une string
        if isinstance(user_id, str) and len(user_id) == 24:
            user_id = ObjectId(user_id)
        
        user = users_collection.find_one({"_id": user_id})
        
        interacted_article_ids = []
        if user:
            log_message(f"Utilisateur trouve: {user.get('name', 'N/A')}")
            
            # Récupérer les articles depuis les listes likes, favorites et read
            likes = user.get("likes", [])
            favorites = user.get("favorites", [])
            read = user.get("read", [])
            
            # Combiner toutes les interactions et éliminer les doublons
            all_interactions = set(likes + favorites + read)
            
            # Convertir en liste de strings
            for article_id in all_interactions:
                if article_id:
                    interacted_article_ids.append(str(article_id))
            
            log_message(f"Articles avec interactions trouvés: {len(interacted_article_ids)}")
        
        client.close()
        return interacted_article_ids
        
    except Exception as e:
        log_message(f"Erreur lors de la récupération des articles avec interactions: {e}")
        return []

def get_article_name(article_id):
    """Récupère le nom d'un article depuis MongoDB en utilisant l'attribut 'title'"""
    try:
        client = MongoClient("mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001")
        db = client["Online_courses"]
        item_collection = db["Articles"]
        
        # Gestion des IDs au format xxxx.xxxx
        article_id_str = str(article_id)
        
        # Si l'ID contient un point décimal, essayer les deux formats
        if '.' in article_id_str:
            # Essayer d'abord avec le format complet "712.0"
            article = item_collection.find_one({"id": article_id_str})
            
            if not article:
                # Essayer avec la partie entière "712"
                article_id_int = article_id_str.split('.')[0]
                article = item_collection.find_one({"id": article_id_int})
            
            if not article:
                # Essayer avec conversion en entier
                try:
                    article_id_num = int(float(article_id_str))
                    article = item_collection.find_one({"id": article_id_num})
                except:
                    pass
        else:
            # ID sans décimale
            article = item_collection.find_one({"id": article_id_str})
            if not article:
                try:
                    article = item_collection.find_one({"id": int(article_id_str)})
                except:
                    pass
        
        if article:
            article_name = (article.get("title") or 
                          article.get("article") or 
                          article.get("name") or 
                          article.get("articleName") or 
                          f"Article {article_id}")
            
            client.close()
            return article_name
        
        client.close()
        log_message(f"Article ID {article_id} non trouve dans MongoDB")
        return f"Article {article_id}"
        
    except Exception as e:
        log_message(f"Erreur lors de la recuperation du nom pour l'article {article_id}: {e}")
        return f"Article {article_id}"

def get_mongodb_id_from_csv_id(csv_id):
    """Trouve l'ObjectId MongoDB correspondant à un ID au format xxxx.xxxx"""
    try:
        csv_id_str = str(csv_id)
        
        # Gestion des IDs au format xxxx.xxxx
        if '.' in csv_id_str:
            # Essayer d'abord avec le format complet
            article = db["Articles"].find_one({"id": csv_id_str})
            
            if not article:
                # Essayer avec la partie entière
                csv_id_int = csv_id_str.split('.')[0]
                article = db["Articles"].find_one({"id": csv_id_int})
            
            if not article:
                # Essayer avec conversion numérique
                try:
                    csv_id_num = int(float(csv_id_str))
                    article = db["Articles"].find_one({"id": csv_id_num})
                except:
                    pass
        else:
            # ID sans décimale
            article = db["Articles"].find_one({"id": csv_id_str})
            if not article:
                try:
                    article = db["Articles"].find_one({"id": int(csv_id_str)})
                except:
                    pass
        
        if article:
            return str(article["_id"])
            
        # Si pas trouvé, retourner un ID aléatoire
        log_message(f"ID {csv_id} non trouvé, sélection aléatoire")
        random_article = db["Articles"].find_one()
        if random_article:
            return str(random_article["_id"])
            
        return None
        
    except Exception as e:
        log_message(f"Erreur lors de la recherche MongoDB pour ID {csv_id}: {e}")
        return None

def recommend_articles(user_id, n_recommendations=10):
    """Recommander des articles en excluant ceux déjà avec interactions"""
    try:
        # Charger les données avec gestion des types
        if not os.path.exists("user_profiles_articles.csv") or not os.path.exists("articles_profiles.csv"):
            log_message("Fichiers CSV manquants")
            return []
            
        user_profiles = pd.read_csv("user_profiles_articles.csv", dtype={'user_id': str})
        # Charger le CSV sans forcer le type de la première colonne
        item_vectors = pd.read_csv("articles_profiles.csv", low_memory=False)

        # Nettoyer et convertir les IDs
        log_message("Nettoyage des IDs d'articles...")
        
        # La première colonne contient les IDs d'articles
        id_column = item_vectors.columns[0]
        
        # Convertir les IDs en string pour gérer le format xxxx.xxxx
        item_vectors[id_column] = item_vectors[id_column].astype(str)
        
        # Supprimer les lignes avec des IDs invalides
        item_vectors = item_vectors[item_vectors[id_column] != 'nan']
        item_vectors = item_vectors[item_vectors[id_column] != '']
        item_vectors = item_vectors.dropna(subset=[id_column])

        # Fixer le problème de dtype pour les colonnes numériques
        log_message("Conversion des types de donnees...")
        item_matrix = item_vectors.iloc[:, 1:].copy()
        
        # Convertir toutes les colonnes numériques en float, remplacer les erreurs par 0
        for col in item_matrix.columns:
            item_matrix[col] = pd.to_numeric(item_matrix[col], errors='coerce').fillna(0)
        
        item_vectors_clean = item_vectors.iloc[:, :1].copy()
        item_vectors_clean = pd.concat([item_vectors_clean, item_matrix], axis=1)

        # Récupérer les articles avec interactions
        interacted_articles = get_user_interacted_articles(user_id)
        log_message(f"Articles avec interactions: {interacted_articles}")

        # Vérifier si l'utilisateur existe dans les profils
        user_id_str = str(user_id)
        if user_id_str not in user_profiles['user_id'].values:
            log_message(f"Utilisateur {user_id_str} non trouve dans les profils")
            return []
        
        user_profile = user_profiles[user_profiles['user_id'] == user_id_str].iloc[0, 1:].values.astype(float)

        similarities = cosine_similarity([user_profile], item_matrix.values)[0]
        
        # Créer un DataFrame avec les similarités
        recommendations_df = pd.DataFrame({
            'article_id': item_vectors_clean.iloc[:, 0],  # Garder comme string
            'similarity': similarities
        })
        
        # Exclure les articles déjà avec interactions
        if interacted_articles:
            # Convertir les interactions en même format
            interacted_articles_str = [str(x) for x in interacted_articles]
            mask = ~recommendations_df['article_id'].isin(interacted_articles_str)
            recommendations_df = recommendations_df[mask]
            log_message(f"Articles restants apres exclusion: {len(recommendations_df)}")
        
        # Pré-trier par similarité
        recommendations_df = recommendations_df.sort_values('similarity', ascending=False)
        
        # Prendre seulement les top candidats
        top_candidates = min(n_recommendations * 3, len(recommendations_df))
        recommendations_df_limited = recommendations_df.head(top_candidates).copy()
        
        # Récupérer les noms des articles
        article_names = []
        for article_id in recommendations_df_limited['article_id']:
            article_name = get_article_name(article_id)
            article_names.append(article_name)
        
        recommendations_df_limited['article_name'] = article_names
        
        # Tri final
        recommendations_df_limited = recommendations_df_limited.sort_values(
            ['similarity', 'article_name'], 
            ascending=[False, True]
        )
        
        # Retourner les top N recommandations
        top_recommendations = recommendations_df_limited.head(n_recommendations)
        result = []
        
        for _, row in top_recommendations.iterrows():
            # Gestion des valeurs NaN
            similarity = row['similarity']
            if pd.isna(similarity):
                similarity = 0.5
                
            result.append({
                'article_id': str(row['article_id']),  # Garder comme string
                'article_name': row['article_name'],
                'similarity': float(similarity)
            })
        
        return result
        
    except Exception as e:
        log_message(f"Erreur lors de la generation des recommandations: {e}")
        return []

# AJOUT: Fonction simple pour Next.js (compatible avec l'interface attendue)
def get_recommendations_for_nextjs(user_id=None, limit=6):
    """Version simplifiée pour Next.js qui retourne les IDs avec scores"""
    try:
        if user_id:
            recommendations = recommend_articles(user_id, limit)
            
            if recommendations:
                formatted_recs = []
                for rec in recommendations:
                    # Gestion des similarités NaN
                    similarity = rec.get('similarity', 0.5)
                    if pd.isna(similarity) or similarity is None:
                        similarity = 0.5
                    
                    # Convertir la similarité en pourcentage
                    score = min(95, max(30, int(similarity * 100)))
                    
                    # Obtenir l'ObjectId MongoDB correspondant
                    mongodb_id = get_mongodb_id_from_csv_id(rec['article_id'])
                    
                    if mongodb_id:
                        formatted_recs.append({
                            "id": mongodb_id,
                            "score": score
                        })
                
                if formatted_recs:
                    return {
                        "success": True,
                        "recommendations": formatted_recs,
                        "user_interests": [],
                        "total_articles": len(formatted_recs)
                    }
                else:
                    log_message("Aucun ID MongoDB trouvé, utilisation du fallback")
                    return get_random_recommendations(limit)
            else:
                return get_random_recommendations(limit)
        else:
            return get_random_recommendations(limit)
            
    except Exception as e:
        log_message(f"Erreur dans get_recommendations_for_nextjs: {e}")
        return get_random_recommendations(limit)

def get_random_recommendations(limit=6):
    """Sélection aléatoire d'articles pour fallback"""
    try:
        # Récupérer des articles aléatoires depuis MongoDB
        articles = list(db["Articles"].aggregate([{"$sample": {"size": limit}}]))
        
        recommendations = []
        for article in articles:
            score = np.random.randint(40, 71)  # Score aléatoire
            recommendations.append({
                "id": str(article["_id"]),
                "score": score
            })
        
        return {
            "success": True,
            "recommendations": recommendations,
            "user_interests": [],
            "total_articles": len(recommendations)
        }
        
    except Exception as e:
        log_message(f"Erreur dans get_random_recommendations: {e}")
        return {
            "success": False,
            "error": str(e),
            "recommendations": []
        }

def main():
    """Fonction principale"""
    try:
        # Vérifier si appelé depuis Next.js (arguments simples)
        if len(sys.argv) <= 3 and not any('--' in arg for arg in sys.argv):
            # Format Next.js: python recommendation.py [user_id] [limit]
            user_id = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "null" else None
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 6
            
            log_message(f"Appel Next.js - User: {user_id}, Limit: {limit}")
            
            result = get_recommendations_for_nextjs(user_id, limit)
            print(json.dumps(result, ensure_ascii=False))
            return
        
        # Format CLI original avec argparse
        parser = argparse.ArgumentParser(description="Systeme de recommandation de articles")
        parser.add_argument("--user-id", required=True, help="ID de l'utilisateur")
        parser.add_argument("--method", default="contenu", choices=["contenu"], help="Methode de recommandation")
        parser.add_argument("--num", type=int, default=10, help="Nombre de recommandations")
        parser.add_argument("--format", default="json", choices=["json", "simple"], help="Format de sortie")
        
        args = parser.parse_args()
        
        log_message(f"Generation de recommandations pour l'utilisateur: {args.user_id}")
        
        if args.method == "contenu":
            top_recommendations = recommend_articles(args.user_id, args.num)
        else:
            top_recommendations = []
        
        if args.format == "json":
            result = {
                "user_id": args.user_id,
                "method": args.method,
                "count": len(top_recommendations),
                "top_recommendations": top_recommendations,
                "timestamp": datetime.now().isoformat()
            }
            print(json.dumps(result, ensure_ascii=False, default=str))
        else:
            if top_recommendations:
                log_message(f"\n=== TOP {len(top_recommendations)} RECOMMANDATIONS ===")
                for i, rec in enumerate(top_recommendations, 1):
                    similarity_percent = round(rec['similarity'] * 100, 1)
                    log_message(f"{i}. {rec['article_name']} (ID: {rec['article_id']}, {similarity_percent}%)")
            else:
                log_message("Aucune recommandation trouvee.")
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "recommendations": []
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()

