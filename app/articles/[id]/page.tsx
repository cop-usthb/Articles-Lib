"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Heart, Bookmark, ExternalLink, Calendar, User, Tag, BookOpen, FileText, Building, Hash, Key } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

interface Article {
  _id: string
  id: string
  num?: number
  title: string
  abstract: string
  authors_parsed: [string, string, string][]
  topic: string[]
  subtopic?: string[]
  categories?: string
  submitter?: string
  "journal-ref"?: string
  doi?: string
  "report-no"?: string
  license?: string
  keywords?: string[]
  createdAt?: string
  readTime?: string
  likes?: number
  satisfaction?: number
}

export default function ArticlePage() {
  const params = useParams()
  const router = useRouter()
  const { user, logout, toggleLike, toggleFavorite, markAsRead } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasMarkedAsRead = useRef(false)

  const fetchArticle = async (articleId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/articles/${articleId}`)
      if (!response.ok) {
        throw new Error("Article non trouvé")
      }
      const data = await response.json()
      setArticle(data.article)
    } catch (error) {
      console.error("Error fetching article:", error)
      setError("Impossible de charger l'article")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchArticle(params.id as string)
    }
  }, [params.id])

  useEffect(() => {
    if (user && params.id && !hasMarkedAsRead.current) {
      markAsRead(params.id as string)
      hasMarkedAsRead.current = true
    }
  }, [user, params.id, markAsRead])

  const handleLike = async () => {
    if (!user || !article) return
    await toggleLike(article.id)
  }

  const handleFavorite = async () => {
    if (!user || !article) return
    await toggleFavorite(article.id)
  }

  const formatAuthors = (authors: [string, string, string][]) => {
    if (!authors || authors.length === 0) return "Auteur inconnu"
    
    return authors.map(([lastName, firstName, middleName]) => {
      const fullName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim()
      return fullName
    }).join(", ")
  }

  const getMainTopic = (topics: string[]) => {
    return topics && topics.length > 0 ? topics[0] : "Non classé"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'article...</p>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-4">{error || "Article non trouvé"}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/articles" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux articles
            </Link>

            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Bonjour, {user.name}</span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Déconnexion
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Article principal */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                {/* Topics et catégories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {getMainTopic(article.topic)}
                  </Badge>
                  {article.subtopic && article.subtopic.length > 0 && (
                    <Badge variant="outline" className="border-green-300 text-green-700">
                      {article.subtopic[0]}
                    </Badge>
                  )}
                  {article.categories && (
                    <Badge variant="secondary">
                      {article.categories}
                    </Badge>
                  )}
                </div>

                <CardTitle className="text-2xl lg:text-3xl leading-tight mb-4">
                  {article.title}
                </CardTitle>

                {/* Informations d'auteur et de soumission */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Auteurs :</span> {formatAuthors(article.authors_parsed)}
                    </div>
                  </div>
                  
                  {article.submitter && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span><span className="font-medium">Soumis par :</span> {article.submitter}</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Actions utilisateur */}
                {user && (
                  <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={user.likes?.includes(article.id) ? "text-red-500" : ""}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${user.likes?.includes(article.id) ? "fill-current" : ""}`} />
                      {user.likes?.includes(article.id) ? "Aimé" : "Aimer"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFavorite}
                      className={user.favorites?.includes(article.id) ? "text-yellow-500" : ""}
                    >
                      <Bookmark className={`h-4 w-4 mr-2 ${user.favorites?.includes(article.id) ? "fill-current" : ""}`} />
                      {user.favorites?.includes(article.id) ? "Favori" : "Ajouter aux favoris"}
                    </Button>
                  </div>
                )}

                <Separator className="my-6" />

                {/* Résumé */}
                <div className="prose max-w-none">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Résumé
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {article.abstract}
                    </p>
                  </div>
                </div>

                {/* Mots-clés */}
                {article.keywords && article.keywords.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Mots-clés
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {article.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar avec informations supplémentaires */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Informations de l'article */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Informations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-medium text-sm text-gray-600">ID Article :</span>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">{article.id}</p>
                  </div>

                  {article.num && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Numéro :</span>
                      <p className="text-sm">{article.num}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Références et liens */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Références
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {article["journal-ref"] && (
                    <div>
                      <span className="font-medium text-sm text-gray-600 flex items-center gap-1 mb-1">
                        <Building className="h-3 w-3" />
                        Journal :
                      </span>
                      <p className="text-sm bg-gray-50 p-2 rounded">{article["journal-ref"]}</p>
                    </div>
                  )}

                  {article.doi && (
                    <div>
                      <span className="font-medium text-sm text-gray-600 mb-1 block">DOI :</span>
                      <a
                        href={`https://doi.org/${article.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 bg-blue-50 p-2 rounded hover:bg-blue-100 transition-colors"
                      >
                        {article.doi}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {article["report-no"] && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Numéro de rapport :</span>
                      <p className="text-sm bg-gray-50 p-2 rounded mt-1">{article["report-no"]}</p>
                    </div>
                  )}

                  {article.license && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Licence :</span>
                      <p className="text-sm">{article.license}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Topics détaillés */}
              {(article.topic.length > 1 || (article.subtopic && article.subtopic.length > 1)) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Classification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {article.topic.length > 0 && (
                      <div>
                        <span className="font-medium text-sm text-gray-600 block mb-2">Topics :</span>
                        <div className="space-y-1">
                          {article.topic.map((topic, index) => (
                            <Badge key={index} variant="secondary" className="mr-2 mb-1">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {article.subtopic && article.subtopic.length > 0 && (
                      <div>
                        <span className="font-medium text-sm text-gray-600 block mb-2">Sous-topics :</span>
                        <div className="space-y-1">
                          {article.subtopic.map((subtopic, index) => (
                            <Badge key={index} variant="outline" className="mr-2 mb-1">
                              {subtopic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
