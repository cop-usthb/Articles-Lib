"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, BookOpen, Users, TrendingUp, Star, Lightbulb, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

interface RecommendedArticle {
  _id: string
  id: string
  title: string
  abstract: string
  authors_parsed: [string, string, string][]
  topic: string
  satisfaction_score: number
  recommendation_reason: string
}

const formatAuthors = (authors: [string, string, string][]) => {
  return authors
    .map(([lastName, firstName, middleName]) => {
      const fullName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim()
      return fullName
    })
    .join(", ")
}

export default function HomePage() {
  const { user, loading, logout } = useAuth()
  const [recommendedArticles, setRecommendedArticles] = useState<RecommendedArticle[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchRecommendations()
  }, [user])

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true)
    setErrorMessage('')
    
    try {
      console.log('Fetching recommendations...') // Debug
      
      const response = await fetch("/api/articles/recommendations", {
        credentials: 'include'
      })
      
      console.log('Response status:', response.status) // Debug
      
      if (response.ok) {
        const data = await response.json()
        console.log('Recommendations data:', data) // Debug
        setRecommendedArticles(data.articles || [])
      } else {
        const errorData = await response.json()
        console.error("Failed to fetch recommendations:", errorData)
        setErrorMessage(errorData.error || 'Erreur lors du chargement des recommandations')
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error)
      setErrorMessage('Impossible de charger les recommandations')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const getSatisfactionColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100"
    if (score >= 60) return "text-yellow-600 bg-yellow-100"
    return "text-orange-600 bg-orange-100"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ScienceLib</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/articles" className="text-gray-500 hover:text-gray-900">
                Articles
              </Link>
              <Link href="/categories" className="text-gray-500 hover:text-gray-900">
                Catégories
              </Link>
              <Link href="/about" className="text-gray-500 hover:text-gray-900">
                À propos
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Bonjour, {user.name}</span>
                  <Link href="/profile">
                    <Button variant="outline" size="sm">Profil</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={logout}>
                    Déconnexion
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/login">
                    <Button variant="outline">Connexion</Button>
                  </Link>
                  <Link href="/register">
                    <Button>Inscription</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Découvrez la Science
            <span className="text-blue-600"> de Demain</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Accédez à une vaste collection d'articles scientifiques de pointe. Explorez, apprenez et restez à jour avec
            les dernières découvertes dans tous les domaines scientifiques.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/articles">
              <Button size="lg" className="w-full sm:w-auto">
                Explorer les Articles
              </Button>
            </Link>
            {!user && (
              <Link href="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Rejoindre la Communauté
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Section Recommandations */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                <Lightbulb className="inline-block w-8 h-8 text-yellow-500 mr-2" />
                Recommandations pour vous
              </h2>
              <p className="text-xl text-gray-600">
                Découvrez des articles populaires et intéressants
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

          {loadingRecommendations ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedArticles.map((article) => (
                <Card key={article._id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary">{article.topic}</Badge>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSatisfactionColor(article.satisfaction_score)}`}>
                        {article.satisfaction_score}%
                      </div>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                    <CardDescription className="text-sm text-blue-600 font-medium">
                      {article.recommendation_reason}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{article.abstract}</p>
                    {article.authors_parsed && article.authors_parsed.length > 0 && (
                      <p className="text-xs text-gray-500 mb-3">
                        Par {formatAuthors(article.authors_parsed)}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">ID: {article.id}</span>
                      <div className="flex items-center space-x-1">
                        <Button size="sm" variant="outline">
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Star className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {recommendedArticles.length === 0 && !loadingRecommendations && !errorMessage && (
            <div className="text-center py-12">
              <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune recommandation disponible</h3>
              <p className="text-gray-600">Essayez de rafraîchir ou de vous connecter pour des recommandations personnalisées.</p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir ScienceLib ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Une plateforme moderne conçue pour les chercheurs, étudiants et passionnés de science
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Recommandations IA</h3>
              <p className="text-gray-600">Notre système intelligent vous propose des articles adaptés à vos intérêts</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Scores de Pertinence</h3>
              <p className="text-gray-600">Chaque recommandation inclut un pourcentage de satisfaction prédit</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Communauté Active</h3>
              <p className="text-gray-600">Rejoignez une communauté de chercheurs et passionnés de science</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <BookOpen className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">ScienceLib</span>
              </div>
              <p className="text-gray-400">
                Votre passerelle vers les dernières découvertes scientifiques
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Accueil</li>
                <li>Articles</li>
                <li>Catégories</li>
                <li>À propos</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Ressources</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Guide d'utilisation</li>
                <li>FAQ</li>
                <li>Support</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>contact@sciencelib.com</li>
                <li>+33 1 23 45 67 89</li>
                <li>Paris, France</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ScienceLib. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
