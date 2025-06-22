"""
Domain Mapper - Ontologie function for aligning meanings between course and article domains
"""

class DomainMapper:
    """Maps concepts between course themes and article topics"""
    
    def __init__(self):
        # Mapping dictionary: course_theme -> article_topics
        self.course_to_article_mapping = {
            # Programming & Development
            "programming": ["programming", "software", "development", "coding"],
            "web_development": ["web", "frontend", "backend", "javascript", "html", "css"],
            "mobile_development": ["mobile", "android", "ios", "react_native", "flutter"],
            "data_science": ["data", "analytics", "machine_learning", "ai", "statistics"],
            "artificial_intelligence": ["ai", "machine_learning", "deep_learning", "neural_networks"],
            
            # Business & Management
            "business": ["business", "management", "strategy", "entrepreneurship"],
            "marketing": ["marketing", "digital_marketing", "seo", "social_media"],
            "finance": ["finance", "investment", "accounting", "economics"],
            "project_management": ["project", "management", "agile", "scrum"],
            
            # Design & Creative
            "design": ["design", "ui", "ux", "graphic_design", "visual"],
            "photography": ["photography", "photo", "visual_arts"],
            "video": ["video", "multimedia", "editing", "production"],
            
            # Languages & Communication
            "language": ["language", "communication", "writing", "linguistics"],
            "english": ["english", "language", "communication"],
            
            # Health & Lifestyle
            "health": ["health", "wellness", "fitness", "nutrition"],
            "lifestyle": ["lifestyle", "personal_development", "productivity"],
            
            # Science & Technology
            "technology": ["technology", "tech", "innovation", "digital"],
            "science": ["science", "research", "academic", "scientific"],
        }
        
        # Reverse mapping: article_topic -> course_themes
        self.article_to_course_mapping = {}
        for course_theme, article_topics in self.course_to_article_mapping.items():
            for topic in article_topics:
                if topic not in self.article_to_course_mapping:
                    self.article_to_course_mapping[topic] = []
                self.article_to_course_mapping[topic].append(course_theme)
    
    def map_course_to_articles(self, course_theme):
        """Convert course theme to related article topics"""
        course_theme_clean = course_theme.lower().strip()
        return self.course_to_article_mapping.get(course_theme_clean, [course_theme_clean])
    
    def map_article_to_courses(self, article_topic):
        """Convert article topic to related course themes"""
        article_topic_clean = article_topic.lower().strip()
        return self.article_to_course_mapping.get(article_topic_clean, [article_topic_clean])
    
    def get_semantic_similarity(self, term1, term2, domain1="course", domain2="article"):
        """Calculate semantic similarity between terms from different domains"""
        term1_clean = term1.lower().strip()
        term2_clean = term2.lower().strip()
        
        # Direct match
        if term1_clean == term2_clean:
            return 1.0
        
        # Cross-domain mapping
        if domain1 == "course" and domain2 == "article":
            mapped_topics = self.map_course_to_articles(term1_clean)
            if term2_clean in mapped_topics:
                return 0.8
        elif domain1 == "article" and domain2 == "course":
            mapped_themes = self.map_article_to_courses(term1_clean)
            if term2_clean in mapped_themes:
                return 0.8
        
        # Partial match (substring)
        if term1_clean in term2_clean or term2_clean in term1_clean:
            return 0.6
        
        return 0.0
    
    def align_user_interests(self, interests, target_domain="article"):
        """Align user interests to target domain vocabulary"""
        aligned_interests = []
        
        for interest in interests:
            interest_clean = interest.lower().strip()
            
            if target_domain == "article":
                # Map course interests to article topics
                mapped = self.map_course_to_articles(interest_clean)
                aligned_interests.extend(mapped)
            elif target_domain == "course":
                # Map article interests to course themes
                mapped = self.map_article_to_courses(interest_clean)
                aligned_interests.extend(mapped)
            else:
                aligned_interests.append(interest_clean)
        
        return list(set(aligned_interests))  # Remove duplicates

# Global instance
domain_mapper = DomainMapper()

def get_domain_mapper():
    """Get the global domain mapper instance"""
    return domain_mapper
