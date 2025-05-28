from pymongo import MongoClient

# Connexion à MongoDB
client = MongoClient("mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001")
db = client["Online_courses"]
collection = db["Articles"]

# Récupérer les topics distincts
distinct_topics = sorted(collection.distinct("topic"))
print(" Topics distincts :")
for topic in distinct_topics:
    print("-", topic)
print("================================================================================================================================")
# Récupérer les subtopics distincts
distinct_subtopics = sorted(collection.distinct("subtopic"))
print("\n Subtopics distincts :")
for subtopic in distinct_subtopics:
    print("-", subtopic)
