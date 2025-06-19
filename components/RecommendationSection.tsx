'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, User, TrendingUp, RefreshCw } from 'lucide-react';

interface Recommendation {
  _id: string;
  title: string;
  abstract: string;
  topic: string[];
  subtopic: string[];
  authors_parsed: [string, string, string][];
  satisfaction_score: number;
  recommendation_reason: string;
}

interface RecommendationSectionProps {
  limit?: number;
}

export default function RecommendationSection({ limit = 12 }: RecommendationSectionProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Chargement des recommandations...');
      
      const response = await fetch(`/api/articles/recommendations?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Pour inclure les cookies (token JWT)
      });

      const data = await response.json();
      
      console.log('Données reçues:', data);
      
      if (data.success) {
        setRecommendations(data.articles || []);
        
        if (data.fallback) {
          console.warn('Utilisation du système de fallback');
        }
      } else {
        setError(data.error || 'Erreur lors du chargement des recommandations');
      }
    } catch (err) {
      console.error('Erreur réseau:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAuthorName = (authors: [string, string, string][]) => {
    if (!authors || authors.length === 0) return 'Auteur inconnu';
    const firstAuthor = authors[0];
    if (Array.isArray(firstAuthor) && firstAuthor.length >= 2) {
      return `${firstAuthor[1]} ${firstAuthor[0]}`.trim() || 'Auteur inconnu';
    }
    return 'Auteur inconnu';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Articles Recommandés
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Chargement...
          </div>
        </div>

        {/* Grid 4 colonnes pour le loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-8"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchRecommendations}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
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
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            {recommendations.length} articles
          </Badge>
          <button 
            onClick={fetchRecommendations}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Actualiser les recommandations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid 4 colonnes pour les recommandations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recommendations.map((article) => (
          <Card key={article._id} className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-xs">
                  {article.topic[0] || 'Science'}
                </Badge>
                <div className={`flex items-center gap-1 font-semibold ${getMatchColor(article.satisfaction_score)}`}>
                  <span className="text-sm">
                    {article.satisfaction_score}%
                  </span>
                </div>
              </div>
              
              <CardTitle className="text-lg line-clamp-2 leading-tight">
                {article.title}
              </CardTitle>
              
              <div className="space-y-2">
                <Progress 
                  value={article.satisfaction_score} 
                  className="w-full h-2"
                />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {article.recommendation_reason}
                </p>
              </div>
            </CardHeader>

            <CardContent className="pt-0 flex-grow flex flex-col justify-between">
              <CardDescription className="line-clamp-3 mb-4 text-sm">
                {article.abstract}
              </CardDescription>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span className="truncate">{getAuthorName(article.authors_parsed)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>5 min</span>
                  </div>
                </div>

                {article.subtopic && article.subtopic[0] && (
                  <Badge variant="outline" className="text-xs w-full justify-center">
                    {article.subtopic[0]}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Aucune recommandation disponible pour le moment.</p>
          <button 
            onClick={fetchRecommendations}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Recharger
          </button>
        </div>
      )}
    </div>
  );
}

/* Section Recommandations */
<section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
  <div className="max-w-7xl mx-auto">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          <Lightbulb className="inline-block w-8 h-8 text-yellow-500 mr-2" />
          Recommandations pour vous
        </h2>
        <p className="text-xl text-gray-600">
          Articles sélectionnés par notre intelligence artificielle
        </p>
      </div>
      <Button 
        onClick={fetchRecommendations}
        variant="outline"
        disabled={loadingRecommendations}
      >
        {loadingRecommendations ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <TrendingUp className="w-4 h-4 mr-2" />
        )}
        Actualiser
      </Button>
    </div>

    {/* Message d'erreur */}
    {errorMessage && (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
        <span className="text-red-700">{errorMessage}</span>
      </div>
    )}

    {/* Utilisation du composant RecommendationSection avec 12 articles */}
    <RecommendationSection limit={12} />
  </div>
</section>