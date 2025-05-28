"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Heart, Bookmark, User, Mail, Calendar, Edit2, Save, X, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"

interface Article {
  id: string
  title: string
  authors_parsed: [string, string, string][]
  abstract: string
  topic: string[]
  readTime?: string
}

export default function ProfilePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    likedArticles: 0,
    favoriteArticles: 0,
    readArticles: 0,
  })
  
  // État pour l'édition des centres d'intérêt
  const [isEditingInterests, setIsEditingInterests] = useState(false)
  const [interests, setInterests] = useState<string[]>([])
  const [availableTopics, setAvailableTopics] = useState<string[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  
  // État pour les articles
  const [likedArticles, setLikedArticles] = useState<Article[]>([])
  const [favoriteArticles, setFavoriteArticles] = useState<Article[]>([])
  const [readArticles, setReadArticles] = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(false)

  const formatAuthors = (authors: [string, string, string][]) => {
    return authors
      .map(([lastName, firstName, middleName]) => {
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ")
        return fullName
      })
      .join(", ")
  }

  const getMainTopic = (topics: string[]) => {
    return topics && topics.length > 0 ? topics[0] : "Non classé"
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user && !loading) {
      setStats({
        likedArticles: user.likes?.length || 0,
        favoriteArticles: user.favorites?.length || 0,
        readArticles: user.read?.length || 0, // Mise à jour pour utiliser read
      })
      
      setInterests(user.interests || [])
      fetchUserArticles()
      fetchAvailableTopics()
    }
  }, [user, loading, router])

  const fetchAvailableTopics = async () => {
    setLoadingTopics(true)
    try {
      const response = await fetch("/api/topics")
      if (response.ok) {
        const data = await response.json()
        setAvailableTopics(data.topics)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des topics:", error)
    } finally {
      setLoadingTopics(false)
    }
  }

  const fetchUserArticles = async () => {
    if (!user) return
    
    setLoadingArticles(true)
    try {
      // Récupérer les articles likés
      if (user.likes && user.likes.length > 0) {
        const likedPromises = user.likes.map(async (articleId: string) => {
          const response = await fetch(`/api/articles/${articleId}`)
          if (response.ok) {
            const data = await response.json()
            return data.article
          }
          return null
        })
        const liked = (await Promise.all(likedPromises)).filter(Boolean)
        setLikedArticles(liked)
      }

      // Récupérer les articles favoris
      if (user.favorites && user.favorites.length > 0) {
        const favoritePromises = user.favorites.map(async (articleId: string) => {
          const response = await fetch(`/api/articles/${articleId}`)
          if (response.ok) {
            const data = await response.json()
            return data.article
          }
          return null
        })
        const favorites = (await Promise.all(favoritePromises)).filter(Boolean)
        setFavoriteArticles(favorites)
      }

      // Récupérer les articles lus
      if (user.read && user.read.length > 0) {
        const readPromises = user.read.map(async (articleId: string) => {
          const response = await fetch(`/api/articles/${articleId}`)
          if (response.ok) {
            const data = await response.json()
            return data.article
          }
          return null
        })
        const read = (await Promise.all(readPromises)).filter(Boolean)
        setReadArticles(read)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des articles:", error)
    } finally {
      setLoadingArticles(false)
    }
  }

  const handleSaveInterests = async () => {
    try {
      const response = await fetch("/api/user/interests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interests }),
      })

      if (response.ok) {
        setIsEditingInterests(false)
        // Mettre à jour l'utilisateur dans le contexte si nécessaire
      } else {
        console.error("Erreur lors de la sauvegarde des centres d'intérêt")
      }
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  const handleInterestChange = (topic: string, checked: boolean) => {
    if (checked) {
      setInterests(prev => [...prev, topic])
    } else {
      setInterests(prev => prev.filter(interest => interest !== topic))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ScienceLib</span>
            </Link>
            <nav className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                Accueil
              </Link>
              <Link href="/articles" className="text-gray-700 hover:text-blue-600">
                Articles
              </Link>
              <span className="text-sm text-gray-700">Bonjour, {user.name}</span>
              <Button variant="outline" onClick={logout}>
                Déconnexion
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <div className="flex items-center text-gray-600 mt-1">
                <Mail className="h-4 w-4 mr-1" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center text-gray-600 mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Membre depuis {new Date(user.createdAt || Date.now()).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles Likés</CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.likedArticles}</div>
              <p className="text-xs text-muted-foreground">Articles que vous avez aimés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favoris</CardTitle>
              <Bookmark className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.favoriteArticles}</div>
              <p className="text-xs text-muted-foreground">Articles sauvegardés en favoris</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles Lus</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.readArticles}</div>
              <p className="text-xs text-muted-foreground">Articles consultés</p>
            </CardContent>
          </Card>
        </div>

        {/* Centres d'intérêt */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Centres d'intérêt</CardTitle>
                <CardDescription>Vos domaines scientifiques préférés</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingInterests(!isEditingInterests)}
              >
                {isEditingInterests ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingInterests ? (
              <div className="space-y-4">
                {loadingTopics ? (
                  <p className="text-gray-500">Chargement des domaines...</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {availableTopics.map((topic) => (
                      <div key={topic} className="flex items-center space-x-2">
                        <Checkbox
                          id={topic}
                          checked={interests.includes(topic)}
                          onCheckedChange={(checked) => handleInterestChange(topic, checked as boolean)}
                        />
                        <label
                          htmlFor={topic}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {topic}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSaveInterests} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingInterests(false)
                      setInterests(user.interests || [])
                    }} 
                    size="sm"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {interests.length > 0 ? (
                  interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-gray-500">Aucun centre d'intérêt défini</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Articles Likés */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Articles Likés ({likedArticles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingArticles ? (
              <p className="text-gray-500">Chargement...</p>
            ) : likedArticles.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {likedArticles.slice(0, 4).map((article) => (
                  <div key={article.id} className="border rounded-lg p-4">
                    <Badge variant="secondary" className="mb-2">
                      {getMainTopic(article.topic)}
                    </Badge>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{article.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">Par {formatAuthors(article.authors_parsed)}</p>
                    <Link href={`/articles/${article.id}`}>
                      <Button size="sm" variant="outline">Lire</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucun article liké</p>
            )}
            {likedArticles.length > 4 && (
              <div className="mt-4">
                <Link href="/articles?liked=true">
                  <Button variant="outline">Voir tous les articles likés</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Articles Favoris */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-yellow-500" />
              Articles Favoris ({favoriteArticles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingArticles ? (
              <p className="text-gray-500">Chargement...</p>
            ) : favoriteArticles.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {favoriteArticles.slice(0, 4).map((article) => (
                  <div key={article.id} className="border rounded-lg p-4">
                    <Badge variant="secondary" className="mb-2">
                      {getMainTopic(article.topic)}
                    </Badge>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{article.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">Par {formatAuthors(article.authors_parsed)}</p>
                    <Link href={`/articles/${article.id}`}>
                      <Button size="sm" variant="outline">Lire</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucun article en favoris</p>
            )}
            {favoriteArticles.length > 4 && (
              <div className="mt-4">
                <Link href="/articles?favorites=true">
                  <Button variant="outline">Voir tous les favoris</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Articles Lus */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Articles Lus ({readArticles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingArticles ? (
              <p className="text-gray-500">Chargement...</p>
            ) : readArticles.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {readArticles.slice(0, 4).map((article) => (
                  <div key={article.id} className="border rounded-lg p-4">
                    <Badge variant="secondary" className="mb-2">
                      {getMainTopic(article.topic)}
                    </Badge>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{article.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">Par {formatAuthors(article.authors_parsed)}</p>
                    <Link href={`/articles/${article.id}`}>
                      <Button size="sm" variant="outline">Relire</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucun article lu</p>
            )}
            {readArticles.length > 4 && (
              <div className="mt-4">
                <Link href="/articles?read=true">
                  <Button variant="outline">Voir tous les articles lus</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
