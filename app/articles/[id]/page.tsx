"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Heart, Star, ExternalLink, Calendar, User, Tag } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

interface Article {
  _id: string
  id: string
  title: string
  abstract: string
  authors_parsed: Array<{ first: string; last: string }>
  topic: string
  subtopic: string
  doi?: string
  journal_ref?: string
  comments?: string
  createdAt?: string
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

  const getMainTopic = (topic: string | undefined) => {
    if (!topic || typeof topic !== "string") {
      return "Topic non défini"
    }
    return topic.split(".")[0].replace(/-/g, " ")
  }

  const formatAuthors = (authors: Array<{ first: string; last: string }>) => {
    if (!authors || authors.length === 0) return "Auteur inconnu"
    if (authors.length === 1) {
      return `${authors[0].first} ${authors[0].last}`
    }
    if (authors.length <= 3) {
      return authors.map((author) => `${author.first} ${author.last}`).join(", ")
    }
    return `${authors[0].first} ${authors[0].last} et al.`
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">{getMainTopic(article.topic)}</Badge>
              {article.subtopic && <Badge variant="outline">{article.subtopic}</Badge>}
            </div>

            <CardTitle className="text-2xl lg:text-3xl leading-tight">{article.title}</CardTitle>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-4">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{formatAuthors(article.authors_parsed)}</span>
              </div>

              {article.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(article.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>ID: {article.id}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Actions */}
            {user && (
              <div className="flex items-center gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
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
                  <Star className={`h-4 w-4 mr-2 ${user.favorites?.includes(article.id) ? "fill-current" : ""}`} />
                  {user.favorites?.includes(article.id) ? "Favori" : "Ajouter aux favoris"}
                </Button>
              </div>
            )}

            <Separator className="my-6" />

            {/* Abstract */}
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold mb-4">Résumé</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{article.abstract}</p>
            </div>

            <Separator className="my-8" />

            {/* Additional Information */}
            <div className="grid md:grid-cols-2 gap-6">
              {article.journal_ref && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Référence de journal</h3>
                  <p className="text-gray-600">{article.journal_ref}</p>
                </div>
              )}

              {article.doi && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">DOI</h3>
                  <a
                    href={`https://doi.org/${article.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {article.doi}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {article.comments && (
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-gray-800 mb-2">Commentaires</h3>
                  <p className="text-gray-600">{article.comments}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
