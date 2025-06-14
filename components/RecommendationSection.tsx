'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, User, TrendingUp } from 'lucide-react';

interface Recommendation {
  _id: string;
  title: string;
  content: string;
  topic: string;
  subtopic: string;
  author: string;
  publishedDate: string;
  readTime: string;
  match_percentage: number;
  recommendation_reason: string;
}

interface RecommendationSectionProps {
  limit?: number;
}

export default function RecommendationSection({ limit = 6 }: RecommendationSectionProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/recommendations?limit=${limit}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || 'Erreur lors du chargement des recommandations');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: limit }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchRecommendations}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Articles Recommandés
        </h2>
        <Badge variant="outline" className="flex items-center gap-1">
          {recommendations.length} articles
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((article) => (
          <Card key={article._id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-xs">
                  {article.topic}
                </Badge>
                <div className={`flex items-center gap-1 font-semibold ${getMatchColor(article.match_percentage)}`}>
                  <span className="text-sm">
                    {article.match_percentage}%
                  </span>
                </div>
              </div>
              
              <CardTitle className="text-lg line-clamp-2">
                {article.title}
              </CardTitle>
              
              <div className="space-y-2">
                <Progress 
                  value={article.match_percentage} 
                  className="w-full h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {article.recommendation_reason}
                </p>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <CardDescription className="line-clamp-3 mb-4">
                {article.content}
              </CardDescription>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{article.readTime}</span>
                </div>
              </div>

              {article.subtopic && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {article.subtopic}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Aucune recommandation disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
}