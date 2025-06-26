#!/usr/bin/env python3
"""
Hybrid Recommendation System Script

This script generates recommendations for users using both GNN (LightGCN) and 
content-based filtering, then ranks them using MMR (Maximal Marginal Relevance).

Usage:
    python recommendation_script.py <user_id> <domain> [options]

Arguments:
    user_id: The user ID to generate recommendations for
    domain: Either 'course' or 'article'

Options:
    --k: Number of recommendations per method (default: 5)
    --lambda_param: MMR lambda parameter for relevance vs diversity trade-off (default: 0.7)
    --embedding_dim: Model embedding dimension (default: 64)
    --num_layers: Number of GNN layers (default: 3)
    --verbose: Enable verbose logging (default: False)
"""

import argparse
import os
import sys
import torch
import torch.nn as nn
from torch_geometric.nn import LightGCN
from pymongo import MongoClient
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
from bson.objectid import ObjectId
import json
import logging
from typing import List, Dict, Tuple, Optional
from scipy import stats  # Add this import for Z-score normalization


class HybridRecommendationSystem:
    def __init__(self, embedding_dim: int = 64, num_layers: int = 3, 
                 model_path: str = "gnn_model/lightgcn_model.pth", verbose: bool = False):
        """
        Initialize the hybrid recommendation system.
        
        Args:
            embedding_dim: Model embedding dimension
            num_layers: Number of GNN layers
            model_path: Path to the saved GNN model
            verbose: Enable verbose logging
        """
        self.mongo_uri = "mongodb+srv://Nazimouzaoui:N%40zim2002@cluster001.y4nrdvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster001"
        self.model_path = model_path
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.verbose = verbose
        
        # Model parameters
        self.embedding_dim = embedding_dim
        self.num_layers = num_layers
        
        # Set up logging
        self._setup_logging()
        
        try:
            # Initialize components
            self._connect_to_mongodb()
            self._load_data()
            self._load_embeddings()
            self._initialize_model()
        except Exception as e:
            self._log_error(f"Initialization failed: {e}")
            # Continue with limited functionality
        
    def _setup_logging(self):
        """Set up logging to file and console."""
        # Create logs directory if it doesn't exist
        os.makedirs('logs', exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=logging.DEBUG if self.verbose else logging.ERROR,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/recommendation_errors.log'),
                logging.StreamHandler(sys.stdout) if self.verbose else logging.NullHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def _log_error(self, message: str):
        """Log error message to file."""
        self.logger.error(message)
        
    def _log_info(self, message: str):
        """Log info message if verbose mode is enabled."""
        if self.verbose:
            self.logger.info(message)
        
    def _connect_to_mongodb(self):
        """Connect to MongoDB and set up collections."""
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client["Online_courses"]
            self.users_col = self.db["users"]
            self.userAR_col = self.db["userAR"]
            self.courses_col = self.db["Course"]
            self.articles_col = self.db["Articles"]
            self._log_info("Connected to MongoDB successfully.")
        except Exception as e:
            self._log_error(f"Error connecting to MongoDB: {e}")
            raise
    
    def _load_data(self):
        """Load user and item data from MongoDB."""
        try:
            self._log_info("Loading data from MongoDB...")
            
            # Get users data
            users_data = list(self.users_col.find({}))
            self.user_ids = [str(user["_id"]) for user in users_data]
            self.course_ids = [str(id) for id in list(self.courses_col.distinct("_id"))]
            self.article_ids = [str(id) for id in list(self.articles_col.distinct("_id"))]
            
            self.num_users = len(self.user_ids)
            self.num_courses = len(self.course_ids)
            self.num_articles = len(self.article_ids)
            self.total_nodes = self.num_users + self.num_courses + self.num_articles
            
            # Create mappings
            self.user_index_map = {user_id: i for i, user_id in enumerate(self.user_ids)}
            self.course_index_map = {course_id: self.num_users + i for i, course_id in enumerate(self.course_ids)}
            self.article_index_map = {article_id: self.num_users + self.num_courses + i for i, article_id in enumerate(self.article_ids)}
            
            self._log_info(f"Loaded data: {self.num_users} users, {self.num_courses} courses, {self.num_articles} articles")
            
            # Create edge index for the graph
            self._create_edge_index(users_data)
        except Exception as e:
            self._log_error(f"Error loading data: {e}")
            # Set default values to continue with limited functionality
            self.user_ids, self.course_ids, self.article_ids = [], [], []
            self.num_users = self.num_courses = self.num_articles = self.total_nodes = 0
            self.user_index_map = self.course_index_map = self.article_index_map = {}
    
    def _create_edge_index(self, users_data):
        """Create edge index for the graph based on user interactions."""
        edge_index_list = [[], []]
        
        # Process course interactions
        for user in users_data:
            user_id = str(user["_id"])
            if user_id not in self.user_index_map:
                continue
            
            user_idx = self.user_index_map[user_id]
            user_courses = user.get("courses", [])
            for course in user_courses:
                course_id = course['courseId']
                if course_id in self.course_index_map:
                    course_idx = self.course_index_map[course_id]
                    edge_index_list[0].extend([user_idx, course_idx])
                    edge_index_list[1].extend([course_idx, user_idx])
        
        # Process article interactions
        userAR = list(self.userAR_col.find({}))
        articles = list(self.articles_col.find({}))
        
        for user in userAR:
            user_id = str(user["_id"])
            if user_id not in self.user_index_map:
                continue
            
            user_idx = self.user_index_map[user_id]
            unique_articles = set()
            
            # Collect interactions from likes, favorites, and read
            likes = user.get("likes", [])
            favorites = user.get("favorites", [])
            read_articles = user.get("read", [])
            
            for article in articles:
                article_id = str(article["_id"])
                if (article["id"] in likes or 
                    article["id"] in favorites or 
                    article["id"] in read_articles):
                    if article_id in self.article_index_map:
                        unique_articles.add(article_id)
            
            for article_id in unique_articles:
                article_idx = self.article_index_map[article_id]
                edge_index_list[0].extend([user_idx, article_idx])
                edge_index_list[1].extend([article_idx, user_idx])
        
        self.edge_index = torch.tensor(edge_index_list, dtype=torch.long).to(self.device)
        self._log_info(f"Created graph with {self.edge_index.size(1)} edges")
    
    def _load_embeddings(self):
        """Load pre-trained embeddings from CSV files."""
        try:
            self._log_info("Loading pre-trained embeddings...")
            
            def load_df(filepath, index_col):
                try:
                    # Load CSV with proper dtype handling to avoid warnings
                    df = pd.read_csv(filepath, dtype=str, low_memory=False)
                    if df.empty or index_col not in df.columns:
                        self._log_error(f"Warning: '{filepath}' is empty or missing '{index_col}' column.")
                        return None
                    df[index_col] = df[index_col].astype(str)
                    df.set_index(index_col, inplace=True)
                    
                    # Convert numeric columns back to float for embeddings
                    for col in df.columns:
                        try:
                            df[col] = pd.to_numeric(df[col], errors='coerce')
                        except:
                            pass
                    
                    # Drop rows/columns with all NaN values
                    df = df.dropna(how='all').dropna(axis=1, how='all')
                    self._log_info(f"Loaded {filepath}: {df.shape[0]} rows, {df.shape[1]} columns")
                    return df
                except FileNotFoundError:
                    self._log_error(f"Warning: File not found at '{filepath}'.")
                    return None
                except Exception as e:
                    self._log_error(f"Error loading {filepath}: {e}")
                    return None
            
            # Load embedding DataFrames
            self.user_course_emb_df = load_df('../e-learning-platform/user_profiles.csv', 'user_id')
            self.user_article_emb_df = load_df('user_profiles_articles.csv', 'user_id')
            self.course_emb_df = load_df('../e-learning-platform/item_vectors_onehot.csv', 'id')
            self.article_emb_df = load_df('articles_profiles.csv', 'id')
            
            # Create projection layers
            self.projection_layers = {}
            
            if self.user_course_emb_df is not None:
                user_course_dim = self.user_course_emb_df.shape[1]
                self.projection_layers['user_course'] = nn.Linear(user_course_dim, self.embedding_dim, bias=False).to(self.device)
            
            if self.user_article_emb_df is not None:
                user_article_dim = self.user_article_emb_df.shape[1]
                self.projection_layers['user_article'] = nn.Linear(user_article_dim, self.embedding_dim, bias=False).to(self.device)
            
            if self.course_emb_df is not None:
                course_dim = self.course_emb_df.shape[1]
                self.projection_layers['course'] = nn.Linear(course_dim, self.embedding_dim, bias=False).to(self.device)
            
            if self.article_emb_df is not None:
                article_dim = self.article_emb_df.shape[1]
                self.projection_layers['article'] = nn.Linear(article_dim, self.embedding_dim, bias=False).to(self.device)
            
            self._log_info("Pre-trained embeddings loaded successfully.")
        except Exception as e:
            self._log_error(f"Error loading embeddings: {e}")
            # Initialize empty structures to continue with limited functionality
            self.user_course_emb_df = self.user_article_emb_df = None
            self.course_emb_df = self.article_emb_df = None
            self.projection_layers = {}
    
    def _initialize_model(self):
        """Initialize and load the trained GNN model."""
        try:
            self._log_info("Initializing GNN model...")
            
            # Only initialize if we have valid data
            if self.total_nodes == 0:
                self._log_error("Cannot initialize model: no data loaded")
                self.model = None
                return
            
            # Initialize model
            self.model = LightGCN(
                num_nodes=self.total_nodes,
                embedding_dim=self.embedding_dim,
                num_layers=self.num_layers
            ).to(self.device)
            
            # Create item embedding dictionaries for content-based recommendations first
            self._create_item_embeddings()
            
            # Load trained weights
            try:
                state_dict = torch.load(self.model_path, map_location=self.device)
                self.model.load_state_dict(state_dict, strict=False)  # Allow size mismatch
                self.model.eval()
                self._log_info("GNN model loaded successfully.")
            except Exception as e:
                self._log_error(f"Error loading model: {e}")
                # Keep the model but with random weights if loading fails
                self._log_info("Continuing with randomly initialized GNN model weights")
        except Exception as e:
            self._log_error(f"Error initializing model: {e}")
            self.model = None
            # Still create empty embedding dictionaries to avoid attribute errors
            self.course_emb_dict = {}
            self.article_emb_dict = {}
    
    def _create_item_embeddings(self):
        """Create item embedding dictionaries for content-based filtering."""
        self.course_emb_dict = {}
        self.article_emb_dict = {}
        
        try:
            with torch.no_grad():
                if self.course_emb_df is not None and 'course' in self.projection_layers:
                    # Handle NaN values in course embeddings
                    course_data = np.nan_to_num(self.course_emb_df.values.astype(np.float32), nan=0.0)
                    course_proj_embs = self.projection_layers['course'](
                        torch.tensor(course_data, device=self.device)
                    ).cpu().detach().numpy()
                    self.course_emb_dict = {id_str: emb for id_str, emb in zip(self.course_emb_df.index, course_proj_embs)}
                    self._log_info(f"Created {len(self.course_emb_dict)} course embeddings")
                
                if self.article_emb_df is not None and 'article' in self.projection_layers:
                    # Handle NaN values in article embeddings
                    article_data = np.nan_to_num(self.article_emb_df.values.astype(np.float32), nan=0.0)
                    article_proj_embs = self.projection_layers['article'](
                        torch.tensor(article_data, device=self.device)
                    ).cpu().detach().numpy()
                    self.article_emb_dict = {id_str: emb for id_str, emb in zip(self.article_emb_df.index, article_proj_embs)}
                    self._log_info(f"Created {len(self.article_emb_dict)} article embeddings")
        except Exception as e:
            self._log_error(f"Error creating item embeddings: {e}")
    
    def get_gnn_recommendations(self, user_id: str, domain: str, k: int = 5) -> List[str]:
        """Get recommendations from the GNN model."""
        try:
            if self.model is None:
                self._log_error("GNN model not available")
                return []
                
            if user_id not in self.user_index_map:
                self._log_error(f"User {user_id} not found in user index map.")
                return []
            
            user_idx = self.user_index_map[user_id]
            
            with torch.no_grad():
                if domain == 'course':
                    if self.num_courses == 0:
                        return []
                    item_indices = torch.arange(self.num_users, self.num_users + self.num_courses, device=self.device)
                else:  # domain == 'article'
                    if self.num_articles == 0:
                        return []
                    item_indices = torch.arange(
                        self.num_users + self.num_courses, 
                        self.num_users + self.num_courses + self.num_articles, 
                        device=self.device
                    )
                
                user_tensor = torch.tensor([user_idx], device=self.device)
                top_indices = self.model.recommend(self.edge_index, src_index=user_tensor, dst_index=item_indices, k=k)
                top_indices = top_indices.cpu().numpy().flatten()
                
                # Convert indices back to IDs
                if domain == 'course':
                    return [self.course_ids[idx - self.num_users] for idx in top_indices if idx - self.num_users < len(self.course_ids)]
                else:
                    return [self.article_ids[idx - (self.num_users + self.num_courses)] 
                           for idx in top_indices if idx - (self.num_users + self.num_courses) < len(self.article_ids)]
        except Exception as e:
            self._log_error(f"Error getting GNN recommendations: {e}")
            return []
    
    def get_content_based_recommendations(self, user_id: str, domain: str, k: int = 5) -> List[str]:
        """Get recommendations from content-based filtering."""
        try:
            # Build user embedding
            user_vecs = []
            if (self.user_course_emb_df is not None and user_id in self.user_course_emb_df.index and 
                'user_course' in self.projection_layers):
                user_data = self.user_course_emb_df.loc[user_id].values
                # Handle NaN values
                user_data = np.nan_to_num(user_data.astype(np.float32), nan=0.0)
                vec = torch.tensor(user_data, device=self.device)
                user_vecs.append(self.projection_layers['user_course'](vec))
            
            if (self.user_article_emb_df is not None and user_id in self.user_article_emb_df.index and 
                'user_article' in self.projection_layers):
                user_data = self.user_article_emb_df.loc[user_id].values
                # Handle NaN values
                user_data = np.nan_to_num(user_data.astype(np.float32), nan=0.0)
                vec = torch.tensor(user_data, device=self.device)
                user_vecs.append(self.projection_layers['user_article'](vec))
            
            if not user_vecs:
                self._log_error(f"No pre-trained embeddings found for user {user_id}")
                return []
            
            user_emb = torch.stack(user_vecs).mean(dim=0).unsqueeze(0)
            
            with torch.no_grad():
                if domain == 'course' and self.course_emb_df is not None and 'course' in self.projection_layers:
                    # Handle NaN values in course embeddings
                    item_data = np.nan_to_num(self.course_emb_df.values.astype(np.float32), nan=0.0)
                    item_mat = torch.tensor(item_data, device=self.device)
                    item_proj = self.projection_layers['course'](item_mat)
                    cos_sim = nn.CosineSimilarity(dim=1)
                    similarities = cos_sim(item_proj, user_emb.expand_as(item_proj))
                    top_indices = torch.topk(similarities, k=min(k, len(similarities))).indices.cpu().numpy()
                    return self.course_emb_df.index[top_indices].tolist()
                
                elif domain == 'article' and self.article_emb_df is not None and 'article' in self.projection_layers:
                    # Handle NaN values in article embeddings
                    item_data = np.nan_to_num(self.article_emb_df.values.astype(np.float32), nan=0.0)
                    item_mat = torch.tensor(item_data, device=self.device)
                    item_proj = self.projection_layers['article'](item_mat)
                    cos_sim = nn.CosineSimilarity(dim=1)
                    similarities = cos_sim(item_proj, user_emb.expand_as(item_proj))
                    top_indices = torch.topk(similarities, k=min(k, len(similarities))).indices.cpu().numpy()
                    return self.article_emb_df.index[top_indices].tolist()
            
            return []
        except Exception as e:
            self._log_error(f"Error getting content-based recommendations: {e}")
            return []
    
    def mmr_diversification(self, candidates: List[str], user_emb: np.ndarray, 
                           item_emb_dict: Dict[str, np.ndarray], 
                           lambda_param: float = 0.7, k: int = 10) -> List[Dict]:
        """Apply MMR diversification to candidate items."""
        if not candidates:
            self._log_error("No candidates provided for MMR diversification")
            return []
        
        valid_candidates = [c for c in candidates if c in item_emb_dict]
        if not valid_candidates:
            self._log_error("No valid candidates found in item embeddings")
            # print the candidates and item_emb_dict for debugging
            self._log_error(f"Item embeddings: {item_emb_dict.keys()}")
            self._log_error(f"Candidates: {candidates}")
            return []
        
        selected = []
        remaining = valid_candidates.copy()
        
        # Precompute relevance scores
        relevance_scores = {}
        for item_id in valid_candidates:
            item_emb = item_emb_dict[item_id]
            relevance_scores[item_id] = np.dot(user_emb.flatten(), item_emb)
        
        # Select first item with highest relevance
        if remaining:
            first_item = max(remaining, key=lambda x: relevance_scores[x])
            selected.append({
                "ID": first_item,
                "Score": relevance_scores[first_item],
                "MMR_Score": relevance_scores[first_item]
            })
            remaining.remove(first_item)
        
        # Iteratively select remaining items using MMR
        while len(selected) < k and remaining:
            mmr_scores = {}
            
            for candidate in remaining:
                relevance = relevance_scores[candidate]
                
                # Calculate max similarity to selected items
                max_similarity = 0.0
                if selected:
                    candidate_emb = item_emb_dict[candidate].reshape(1, -1)
                    for sel_item in selected:
                        selected_emb = item_emb_dict[sel_item["ID"]].reshape(1, -1)
                        similarity = cosine_similarity(candidate_emb, selected_emb)[0][0]
                        max_similarity = max(max_similarity, similarity)
                
                # MMR formula
                mmr_score = lambda_param * relevance - (1 - lambda_param) * max_similarity
                mmr_scores[candidate] = mmr_score
            
            # Select item with highest MMR score
            if mmr_scores:
                best_item = max(mmr_scores.keys(), key=lambda x: mmr_scores[x])
                selected.append({
                    "ID": best_item,
                    "Score": relevance_scores[best_item],
                    "MMR_Score": mmr_scores[best_item]
                })
                remaining.remove(best_item)
            else:
                self._log_error("No valid MMR scores computed, stopping selection")
                continue
        
        return selected
    
    def get_user_embedding(self, user_id: str) -> Optional[np.ndarray]:
        """Get unified user embedding for content-based scoring."""
        try:
            user_vecs = []
            
            if (self.user_course_emb_df is not None and 
                user_id in self.user_course_emb_df.index and 
                'user_course' in self.projection_layers):
                user_data = self.user_course_emb_df.loc[user_id].values
                # Handle NaN values
                user_data = np.nan_to_num(user_data.astype(np.float32), nan=0.0)
                vec = torch.tensor(user_data, device=self.device)
                user_vecs.append(self.projection_layers['user_course'](vec))
            
            if (self.user_article_emb_df is not None and 
                user_id in self.user_article_emb_df.index and 
                'user_article' in self.projection_layers):
                user_data = self.user_article_emb_df.loc[user_id].values
                # Handle NaN values
                user_data = np.nan_to_num(user_data.astype(np.float32), nan=0.0)
                vec = torch.tensor(user_data, device=self.device)
                user_vecs.append(self.projection_layers['user_article'](vec))
            
            if not user_vecs:
                return None
            
            with torch.no_grad():
                user_emb = torch.stack(user_vecs).mean(dim=0).cpu().detach().numpy().reshape(1, -1)
            
            return user_emb
        except Exception as e:
            self._log_error(f"Error getting user embedding: {e}")
            return None
    
    def get_item_title(self, item_id: str, domain: str, method: str) -> str:
        """Get the title/name of an item."""
        try:
            if domain == 'course':
                if method == "gnn":
                    doc = self.courses_col.find_one({"_id": ObjectId(item_id)})
                    return str(doc.get("id")), doc.get("course", f"Course {item_id}") if doc else f"Unknown Course {item_id}"
                else:
                    doc = self.courses_col.find_one({"id": int(item_id)})
                    return str(doc.get("id")), doc.get("course", f"Course {item_id}") if doc else f"Unknown Course {item_id}"
            else:  # domain == 'article'
                # Handle article ID formatting
                search_id = item_id
                if item_id.startswith('7') and '.' in item_id:
                    search_id = "0" + item_id
                if method == "gnn":
                    doc = self.articles_col.find_one({"_id": ObjectId(item_id)})
                else:
                    doc = self.articles_col.find_one({"id": search_id})
                return doc.get("id"), doc.get("title", f"Article {item_id}") if doc else f"Unknown Article {item_id}"
        except Exception as e:
            self._log_error(f"Error fetching title for {item_id}: {e}")
            return item_id, f"Unknown {domain.title()} {item_id}"
    

    def normalize_scores_to_percentage(self, scores: List[float]) -> List[float]:
        """
        Normalize scores using Z-Score normalization and clipping to percentage.
        
        Args:
            scores: List of raw MMR scores
            
        Returns:
            List of normalized scores as percentages (0-100)
        """
        if not scores or len(scores) == 1:
            return [50.0] * len(scores)  # Default to 50% if no variation
        
        try:
            # Convert to numpy array
            scores_array = np.array(scores)
            
            # Z-Score normalization
            z_scores = stats.zscore(scores_array)
            
            # Clip z-scores to reasonable range (-3, 3) to avoid extreme values
            z_scores_clipped = np.clip(z_scores, -3, 3)
            
            # Transform to 0-100 range
            # Map -3 to 0 and +3 to 100
            percentages = ((z_scores_clipped + 3) / 6) * 100
            
            # Ensure values are within [0, 100] range
            percentages = np.clip(percentages, 0, 100)
            
            return percentages.tolist()
            
        except Exception as e:
            self._log_error(f"Error normalizing scores: {e}")
            # Return uniform distribution if normalization fails
            return [50.0] * len(scores)

    def generate_recommendations(self, user_id: str, domain: str, 
                               k: int = 5, lambda_param: float = 0.7) -> List[Dict]:
        """
        Generate hybrid recommendations using GNN + Content-Based + MMR.
        
        Args:
            user_id: User ID to generate recommendations for
            domain: 'course' or 'article'
            k: Number of recommendations per method
            lambda_param: MMR lambda parameter (relevance vs diversity trade-off)
        
        Returns:
            List of dictionaries with recommendation details
        """
        try:
            self._log_info(f"Generating {domain} recommendations for user {user_id}...")

            
            # Get recommendations from both models
            gnn_recs = self.get_gnn_recommendations(user_id, domain, k=k)
            cb_recs = self.get_content_based_recommendations(user_id, domain, k=k)
            
            self._log_info(f"GNN recommendations: {len(gnn_recs)}")
            for rec in gnn_recs:
                self._log_info(f"Recommended: {json.dumps(rec)}")
            self._log_info(f"Content-based recommendations: {len(cb_recs)}")
            for rec in cb_recs:
                self._log_info(f"Recommended Articles: {json.dumps(rec)}")
            
            # Return recommendations from available methods
            final_results = []
            
            
            # Add GNN recommendations
            for i, item_id in enumerate(gnn_recs):
                id, title = self.get_item_title(item_id, domain, "gnn")
                self._log_info(f"Adding GNN recommendation: {id} - {title}")
                final_results.append({
                    "id": id,
                    "title": title,
                    "score": 1.0 - (i * 0.1),  # Simple scoring based on rank
                    "method": "gnn"
                })

            # Add content-based recommendations
            for i, item_id in enumerate(cb_recs):
                id, title = self.get_item_title(item_id, domain, "cb")
                final_results.append({
                    "id": id,
                    "title": title,
                    "score": 1.0 - (i * 0.1),  # Simple scoring based on rank
                    "method": "content_based"
                })
            
            self._log_info(f"Total candidates before MMR: {len(final_results)}")
            for result in final_results:
                self._log_info(f"Candidate: {result['id']} - {result['title']} - Score: {result['score']} - Method: {result['method']}")
            
            # Apply MMR if we have user embeddings and item embeddings
            user_emb = self.get_user_embedding(user_id)
            if user_emb is not None and final_results:
                item_emb_dict = self.course_emb_dict if domain == 'course' else self.article_emb_dict
                all_candidates = [r["id"] for r in final_results]
                
                if item_emb_dict and all_candidates:
                    mmr_results = self.mmr_diversification(all_candidates, user_emb, item_emb_dict, lambda_param, k*2)
                    self._log_info(f"MMR results: {len(mmr_results)}")
                    
                    # Extract MMR scores for normalization
                    mmr_scores = [item["MMR_Score"] for item in mmr_results]
                    normalized_percentages = self.normalize_scores_to_percentage(mmr_scores)
                    
                    # Update final results with MMR scores, percentages and combine sources
                    mmr_dict = {item["ID"]: (item, percentage) for item, percentage in zip(mmr_results, normalized_percentages)}
                    updated_results = []
                    
                    for result in final_results:
                        item_id = result["id"]
                        if item_id in mmr_dict:
                            mmr_item, score_percentage = mmr_dict[item_id]
                            
                            # Determine sources
                            sources = []
                            if item_id in gnn_recs:
                                sources.append("gnn")
                            if item_id in cb_recs:
                                sources.append("content_based")
                            
                            updated_results.append({
                                "id": item_id,
                                "title": result["title"],
                                "score": float(mmr_item["MMR_Score"]),
                                "score_percentage": round(score_percentage, 1),  # Add normalized percentage score
                                "method": " + ".join(sources) if len(sources) > 1 else sources[0] if sources else "gnn"
                            })
                    
                    final_results = updated_results
            else:
                # If no MMR is applied, still add score_percentage based on ranking
                ranking_scores = [result["score"] for result in final_results]
                normalized_percentages = self.normalize_scores_to_percentage(ranking_scores)
                
                for i, result in enumerate(final_results):
                    result["score_percentage"] = round(normalized_percentages[i], 1)
            
            # Sort by score (descending)
            final_results.sort(key=lambda x: x["score"], reverse=True)
            
            return final_results
            
        except Exception as e:
            self._log_error(f"Error generating recommendations: {e}")
            # Return basic recommendations if available
            basic_results = []
            try:
                gnn_recs = self.get_gnn_recommendations(user_id, domain, k=k)
                basic_scores = [1.0 - (i * 0.1) for i in range(len(gnn_recs))]
                normalized_percentages = self.normalize_scores_to_percentage(basic_scores)
                
                for i, item_id in enumerate(gnn_recs):
                    title = self.get_item_title(item_id, domain)
                    basic_results.append({
                        "id": item_id,
                        "title": title,
                        "score": basic_scores[i],
                        "score_percentage": round(normalized_percentages[i], 1),
                        "method": "gnn"
                    })
            except:
                pass
            return basic_results

    

def main():
    parser = argparse.ArgumentParser(description='Generate hybrid recommendations')
    parser.add_argument('user_id', type=str, help='User ID to generate recommendations for')
    parser.add_argument('domain', type=str, choices=['course', 'article'], 
                       help='Domain for recommendations')
    parser.add_argument('--k', type=int, default=15, 
                       help='Number of recommendations per method (default: 5)')
    parser.add_argument('--lambda_param', type=float, default=0.7,
                       help='MMR lambda parameter for relevance vs diversity (default: 0.7)')
    parser.add_argument('--embedding_dim', type=int, default=64,
                       help='Model embedding dimension (default: 64)')
    parser.add_argument('--num_layers', type=int, default=3,
                       help='Number of GNN layers (default: 3)')
    parser.add_argument('--model_path', type=str, default='gnn_model/lightgcn_model.pth',
                       help='Path to saved GNN model')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging (default: False)')
    
    args = parser.parse_args()
    
    try:
        # Initialize recommendation system
        recommender = HybridRecommendationSystem(
            embedding_dim=args.embedding_dim,
            num_layers=args.num_layers,
            model_path=args.model_path,
            verbose=args.verbose
        )
        
        # Generate recommendations
        recommendations = recommender.generate_recommendations(
            user_id=args.user_id,
            domain=args.domain,
            k=args.k,
            lambda_param=args.lambda_param
        )
        
        # Always output as JSON
        print(json.dumps(recommendations, indent=2))
    
    except Exception as e:
        error_msg = {"error": str(e), "recommendations": []}
        print(json.dumps(error_msg, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
