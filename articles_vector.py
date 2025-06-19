from pymongo import MongoClient
import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer

# Connexion MongoDB
client = MongoClient("mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001")
db = client["Online_courses"]
collection = db["Articles"]

# Chargement des documents avec les champs nécessaires
documents = list(collection.find({}, {
    "_id": 0,
    "id": 1,
    "topic": 1,
    "subtopic": 1,
    "keywords": 1
}))

# Conversion en DataFrame
df = pd.DataFrame(documents)

# Nettoyage et remplissage des colonnes manquantes
df["topic"] = df["topic"].apply(lambda x: x if isinstance(x, list) else ["unknown"])
df["subtopic"] = df["subtopic"].apply(lambda x: x if isinstance(x, list) else ["unknown"])
df["keywords"] = df["keywords"].apply(lambda x: x if isinstance(x, list) else [])

# Encodage One-Hot avec MultiLabelBinarizer
mlb_topic = MultiLabelBinarizer()
df_topic = pd.DataFrame(mlb_topic.fit_transform(df["topic"]), columns=[f"topic_{c}" for c in mlb_topic.classes_])

mlb_subtopic = MultiLabelBinarizer()
df_subtopic = pd.DataFrame(mlb_subtopic.fit_transform(df["subtopic"]), columns=[f"subtopic_{c}" for c in mlb_subtopic.classes_])

mlb_keywords = MultiLabelBinarizer()
df_keywords = pd.DataFrame(mlb_keywords.fit_transform(df["keywords"]), columns=[f"keyword_{c}" for c in mlb_keywords.classes_])

# Fusion finale
df_final = pd.concat([df["id"], df_topic, df_subtopic, df_keywords], axis=1)

# Export vers CSV
df_final.to_csv("articles_profiles.csv", index=False)

print(" Fichier 'articles_profiles.csv' généré avec succès.")
