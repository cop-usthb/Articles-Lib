from pymongo import MongoClient
import pandas as pd
import numpy as np
import argparse
import sys
import os
from datetime import datetime
import traceback

def update_user_profiles_articles():
    try:
        print("====== DÉMARRAGE DE LA MISE À JOUR DES PROFILS UTILISATEURS (ARTICLES) ======")
        print(f"Répertoire courant: {os.getcwd()}")

        data_file = "articles_profiles.csv"
        if not os.path.exists(data_file):
            print(f"ERREUR: Le fichier {data_file} n'existe pas dans {os.getcwd()}")
            parent_dir = os.path.dirname(os.getcwd())
            parent_file = os.path.join(parent_dir, data_file)
            if os.path.exists(parent_file):
                print(f"Fichier trouvé dans: {parent_file}")
                data_file = parent_file
            else:
                print(f"ERREUR: Le fichier {data_file} est introuvable!")
                return False

        # Connexion à MongoDB
        print("Connexion à MongoDB...")
        client = MongoClient("mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001")
        db = client["Online_courses"]
        users_collection = db["userAR"]

        print("Récupération des utilisateurs...")
        users_count = users_collection.count_documents({})
        print(f"Nombre d'utilisateurs trouvés: {users_count}")

        # Chargement des vecteurs d'articles
        print(f"Chargement du fichier {data_file}...")
        item_vectors_df = pd.read_csv(data_file, dtype={'id': str}, low_memory=False)
        print(f"Dimension initiale du fichier: {item_vectors_df.shape}")

        if 'id' not in item_vectors_df.columns:
            print(f"ERREUR: La colonne 'id' est absente du fichier {data_file}")
            return False

        # Suppression des doublons par id
        duplicated_count = item_vectors_df.duplicated(subset='id', keep=False).sum()
        if duplicated_count > 0:
            print(f"ATTENTION: {duplicated_count} doublons détectés dans la colonne 'id'.")
            item_vectors_df = item_vectors_df.drop_duplicates(subset='id', keep='first')
            print(f"Dimensions après suppression des doublons: {item_vectors_df.shape}")

        item_vectors_df.set_index("id", inplace=True)
        vector_columns = list(item_vectors_df.columns)

        user_profiles = []
        print("Traitement des profils utilisateurs à partir des likes/favorites/consultations...")

        for user in users_collection.find():
            user_id = str(user["_id"])
            likes = user.get("likes", [])
            favorites = user.get("favorites", [])
            read_articles = user.get("read", [])  # Utiliser 'read' au lieu de 'consultations'
            interests = user.get("interests", [])

            user_vector = np.zeros(item_vectors_df.shape[1])
            weighted_sum = np.zeros(len(vector_columns))
            total_weight = 0.0

            # Likes (poids 1.0)
            for article_id in likes:
                article_id_str = str(article_id)
                if article_id_str in item_vectors_df.index:
                    weighted_sum += item_vectors_df.loc[article_id_str].values.astype(float) * 1.0
                    total_weight += 1.0

            # Favorites (poids 1.5)
            for article_id in favorites:
                article_id_str = str(article_id)
                if article_id_str in item_vectors_df.index:
                    weighted_sum += item_vectors_df.loc[article_id_str].values.astype(float) * 1.5
                    total_weight += 1.5

            # Articles lus (poids 0.5)
            for article_id in read_articles:
                article_id_str = str(article_id)
                if article_id_str in item_vectors_df.index:
                    weighted_sum += item_vectors_df.loc[article_id_str].values.astype(float) * 0.5
                    total_weight += 0.5

            # Intérêts textuels
            interest_vector = np.zeros(len(vector_columns))
            for interest in interests:
                interest_clean = interest.strip().lower()
                target_column = f"topic_{interest_clean}"
                for idx, col in enumerate(vector_columns):
                    if col.lower() == target_column:
                        interest_vector[idx] = 1

            # Combinaison finale
            if total_weight > 0 and np.any(interest_vector):
                article_vector = weighted_sum / total_weight
                user_vector = (article_vector + interest_vector) / 2.0
            elif total_weight > 0:
                user_vector = weighted_sum / total_weight
            elif np.any(interest_vector):
                user_vector = interest_vector
            else:
                user_vector = np.zeros(len(vector_columns))

            user_profiles.append([user_id] + list(user_vector))

        # DataFrame final
        columns = ["user_id"] + vector_columns
        profiles_df = pd.DataFrame(user_profiles, columns=columns)

        if len(profiles_df) == 0:
            print("Aucun profil utilisateur généré!")
            return False

        output_path = os.path.join(os.getcwd(), "user_profiles_articles.csv")
        profiles_df.to_csv(output_path, index=False)
        print(f"Profils sauvegardés dans: {output_path}")
        print("====== MISE À JOUR TERMINÉE AVEC SUCCÈS ======")
        return True

    except Exception as e:
        print(f"ERREUR CRITIQUE: {str(e)}")
        print(traceback.format_exc())
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mise à jour des profils utilisateurs (Articles)")
    parser.add_argument("--trigger", type=str, help="Déclencheur (user_created, interests_updated, article_read, article_liked, article_favorited)", default="manual")
    
    args = parser.parse_args()
    print(f"Mise à jour déclenchée par: {args.trigger}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    success = update_user_profiles_articles()
    
    if success:
        print("Exécution réussie!")
        sys.exit(0)
    else:
        print("Échec de l'exécution!")
        sys.exit(1)
