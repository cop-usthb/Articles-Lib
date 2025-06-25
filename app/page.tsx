"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, BookOpen, Users, TrendingUp, Bookmark, Lightbulb, Loader2, AlertCircle, User, Clock, LogIn, UserPlus } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import RecommendationSection from '@/components/RecommendationSection';

interface RecommendedArticle {
  _id: string
  id: string
  title: string
  abstract: string
  authors_parsed: [string, string, string][]
  topic: string[]
  satisfaction_score: number
  recommendation_reason: string
}

const formatAuthors = (authors: [string, string, string][]) => {
  if (!authors || authors.length === 0) return "Auteur inconnu"
  
  return authors
    .slice(0, 2)
    .map(([lastName, firstName, middleName]) => {
      const fullName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim()
      return fullName
    })
    .join(", ") + (authors.length > 2 ? ` et ${authors.length - 2} autres` : "")
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

export default function HomePage() {
  const { user, loading, logout, toggleLike, toggleFavorite } = useAuth()
  const [recommendedArticles, setRecommendedArticles] = useState<RecommendedArticle[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // 🔧 MODIFICATION: Ne charger les recommandations que si l'utilisateur est connecté
    if (user) {
      fetchRecommendations()
    } else {
      // Réinitialiser les recommandations si l'utilisateur se déconnecte
      setRecommendedArticles([])
      setErrorMessage('')
    }
  }, [user])

  const fetchRecommendations = async () => {
    // 🔧 GARDE: Ne pas exécuter si pas d'utilisateur
    if (!user) {
      return
    }

    setLoadingRecommendations(true)
    setErrorMessage('')
    
    try {
      const response = await fetch("/api/articles/recommendations", {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setRecommendedArticles(data.articles || [])
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Erreur lors du chargement des recommandations')
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error)
      setErrorMessage('Impossible de charger les recommandations')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleLike = async (articleId: string) => {
    if (!user) return
    try {
      await toggleLike(articleId)
    } catch (error) {
      console.error("Failed to toggle like:", error)
    }
  }

  const handleFavorite = async (articleId: string) => {
    if (!user) return
    try {
      await toggleFavorite(articleId)
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    }
  }

  const getMainTopic = (topics: string[]) => {
    return topics && topics.length > 0 ? topics[0] : "Non classé"
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
                  <span className="text-sm text-gray-600">{user.name}</span>
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

      {/* Section Recommandations - MODIFIÉE */}
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
            {/* 🔧 MODIFICATION: Bouton "Actualiser" visible seulement si connecté */}
            {user && (
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
            )}
          </div>

          {/* 🔧 MODIFICATION PRINCIPALE: Affichage conditionnel selon l'état de connexion */}
          {!user ? (
            // Utilisateur NON connecté - Message d'invitation
            <div className="text-center py-16 px-4">
              <div className="max-w-md mx-auto">
                <div className="bg-blue-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-12 h-12 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Découvrez vos recommandations personnalisées
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Connectez-vous pour accéder à des recommandations d'articles scientifiques 
                  personnalisées grâce à notre intelligence artificielle avancée.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-6">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span>Recommandations IA</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span>Contenu personnalisé</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      <span>Suivi des lectures</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/login">
                      <Button size="lg" className="w-full sm:w-auto">
                        <LogIn className="mr-2 h-5 w-5" />
                        Se Connecter
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto">
                        <UserPlus className="mr-2 h-5 w-5" />
                        Créer un Compte
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Utilisateur connecté - Affichage des recommandations
            <>
              {/* Message d'erreur */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-700">{errorMessage}</span>
                </div>
              )}

              {/* Grille des recommandations */}
              {loadingRecommendations ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Génération des recommandations...</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedArticles.map((article, index) => (
                    <Card key={article._id} className="hover:shadow-lg transition-shadow relative">
                      {/* Badge de pourcentage d'exactitude */}
                      <div className="absolute top-3 right-3 z-10">
                        <Badge 
                          variant="secondary" 
                          className="bg-blue-100 text-blue-800 border-blue-200 font-semibold px-2 py-1 text-xs"
                        >
                          {article.satisfaction_score}% 
                        </Badge>
                      </div>

                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {getMainTopic(article.topic)}
                          </Badge>
                        </div>
                        
                        <CardTitle className="text-lg leading-tight line-clamp-2 pr-16">
                          {article.title}
                        </CardTitle>
                        
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <User className="h-4 w-4 mr-1" />
                          <span>{formatAuthors(article.authors_parsed)}</span>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {article.abstract}
                        </p>

                        <div className="flex items-center justify-between">
                          <Link href={`/articles/${article.id}`}>
                            <Button size="sm" variant="outline">
                              Lire l'article
                            </Button>
                          </Link>
                          
                          <div className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            5 min de lecture
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
                  <p className="text-gray-600">Essayez de rafraîchir pour obtenir des recommandations personnalisées.</p>
                </div>
              )}
            </>
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
