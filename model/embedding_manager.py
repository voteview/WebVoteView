""" Handles embedding generation and storage for vote descriptions. """

import pymongo
from sentence_transformers import SentenceTransformer
from pymongo.operations import UpdateOne
from model.config import config
import sys

model = None

def get_model():
    global model
    if model is None:
        model = SentenceTransformer("nomic-ai/nomic-embed-text-v1", trust_remote_code=True)
    return model

def get_embedding(text, precision="float32"):
    if not text or text.strip() == "":
        return None
    try:
        return get_model().encode(text, precision=precision).tolist()
    except Exception:
        return None

def generate_embeddings_for_votes():
    client = pymongo.MongoClient(config["db_uri"])
    db = client[config["db_name"]]
    collection = db.voteview_rollcalls
    
    # Get status first
    total_with_desc = collection.count_documents({
        "vote_desc": {"$exists": True, "$nin": [None, ""]}
    })
    
    total_with_embeddings = collection.count_documents({
        "vote_desc_embedding": {"$exists": True}
    })
    
    filter_query = {
        "vote_desc": {"$exists": True, "$nin": [None, ""]},
        "vote_desc_embedding": {"$exists": False}
    }
    
    total_missing = collection.count_documents(filter_query)
    
    print(f"Embedding Status:")
    print(f"  Total votes with descriptions: {total_with_desc}")
    print(f"  Already have embeddings: {total_with_embeddings}")
    print(f"  Need embeddings: {total_missing}")
    
    if total_missing == 0:
        print("  ✓ All votes already have embeddings")
        client.close()
        return
    
    print(f"  Generating embeddings for {total_missing} votes...")
    
    batch_size = 100
    processed = 0
    cursor = collection.find(filter_query, {"_id": 1, "vote_desc": 1}).batch_size(batch_size)
    operations = []
    
    for doc in cursor:
        embedding = get_embedding(doc.get("vote_desc", ""))
        if embedding is not None:
            operations.append(UpdateOne(
                {"_id": doc["_id"]},
                {"$set": {"vote_desc_embedding": embedding}}
            ))
            
            if len(operations) >= batch_size:
                result = collection.bulk_write(operations)
                processed += result.modified_count
                progress = (processed / total_missing) * 100
                bar_length = 40
                filled_length = int(bar_length * processed / total_missing)
                bar = '█' * filled_length + '-' * (bar_length - filled_length)
                sys.stdout.write(f"\r  Progress: [{bar}] {processed}/{total_missing} ({progress:.1f}%)")
                sys.stdout.flush()
                operations = []
    
    if operations:
        result = collection.bulk_write(operations)
        processed += result.modified_count
    
    print(f"\n  ✓ Completed: {processed} embeddings generated")
    client.close()

def create_vector_search_index():
    client = pymongo.MongoClient(config["db_uri"])
    db = client[config["db_name"]]
    collection = db.voteview_rollcalls
    
    try:
        existing_indexes = list(collection.list_search_indexes())
        for index in existing_indexes:
            if index.get("name") == "vote_vector_search":
                client.close()
                return
    except Exception:
        pass
    
    # Create index definition without SearchIndexModel for older pymongo versions
    try:
        collection.create_search_index({
            "name": "vote_vector_search",
            "definition": {
                "fields": [{
                    "type": "vector",
                    "path": "vote_desc_embedding", 
                    "similarity": "dotProduct",
                    "numDimensions": 768
                }]
            }
        })
        print("  ✓ Created vector search index")
    except Exception:
        pass
    
    client.close()

def check_embedding_status():
    client = pymongo.MongoClient(config["db_uri"])
    db = client[config["db_name"]]
    collection = db.voteview_rollcalls
    
    total_with_desc = collection.count_documents({
        "vote_desc": {"$exists": True, "$nin": [None, ""]}
    })
    
    total_with_embeddings = collection.count_documents({
        "vote_desc_embedding": {"$exists": True}
    })
    
    client.close()
    return total_with_desc, total_with_embeddings

if __name__ == "__main__":
    check_embedding_status()
    generate_embeddings_for_votes()
    create_vector_search_index() 