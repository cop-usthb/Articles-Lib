"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, BookOpen, Star, Search } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import type { Article } from "@/lib/models/Article"

const formatAuthors = (authors: [string, string, string][]) => {
  return authors
    .map(([lastName, firstName, middleName]) => {
      const fullName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim()
      return fullName
    })
    .join(", ")
}

const getMainTopic = (topics: string[]) => {
  return topics && topics.length > 0 ? topics[0] : "Non classé"
}

const getMainSubtopic = (subtopics: string[]) => {
  return subtopics && subtopics.length > 0 ? subtopics[0] : ""
}

export default function ArticlesPage() {
  const { user, logout, toggleLike, toggleFavorite, markAsRead } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Toutes")
  const [categories, setCategories] = useState<string[]>(["Toutes"])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [currentPage, searchTerm, selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/articles/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
      })

      if (searchTerm) {
        params.append("search", searchTerm)
      }

      if (selectedCategory !== "Toutes") {
        params.append("category", selectedCategory)
      }

      const response = await fetch(`/api/articles?${params}`)
      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      } else {
        console.error("Failed to fetch articles")
      }
    } catch (error) {
      console.error("Error fetching articles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (articleId: string) => {
    if (!user) return
    try {
      await toggleLike(articleId)
      // Update the local state to reflect the change
      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? {
                ...article,
                likes: user.likes.includes(articleId) ? (article.likes || 0) - 1 : (article.likes || 0) + 1,
              }
            : article,
        ),
      )
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

  const handleReadArticle = async (articleId: string) => {
    if (user) {
      await markAsRead(articleId)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchArticles()
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
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
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link href="/profile" className="text-gray-700 hover:text-blue-600">
                    Profil
                  </Link>
                  <span className="text-sm text-gray-700">Bonjour, {user.name}</span>
                  <Button variant="outline" onClick={logout}>
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
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tous les Articles</h1>
          <p className="text-gray-600">Découvrez notre collection complète d'articles scientifiques</p>
        </div>

        {/* Search and Filters */}
        <form onSubmit={handleSearch} className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher par titre, auteur, mots-clés..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">Rechercher</Button>
        </form>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {total} article{total !== 1 ? "s" : ""} trouvé{total !== 1 ? "s" : ""}
            {totalPages > 1 && ` - Page ${currentPage} sur ${totalPages}`}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Chargement des articles...</p>
          </div>
        ) : (
          <>
            {/* Articles Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {articles.map((article) => (
                <Card key={article._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary">{getMainTopic(article.topic)}</Badge>
                    </div>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription>Par {formatAuthors(article.authors_parsed)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{article.abstract}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                      <span>ID: {article.id}</span>
                      {article.readTime && <span>{article.readTime}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(article.id)}
                          className={user?.likes.includes(article.id) ? "text-red-500" : ""}
                        >
                          <Heart className={`h-4 w-4 ${user?.likes.includes(article.id) ? "fill-current" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFavorite(article.id)}
                          className={user?.favorites.includes(article.id) ? "text-yellow-500" : ""}
                        >
                          <Star className={`h-4 w-4 ${user?.favorites.includes(article.id) ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                      <Link href={`/articles/${article.id}`}>
                        <Button
                          size="sm"
                          onClick={() => handleReadArticle(article.id)}
                        >
                          Lire
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}

            {articles.length === 0 && !loading && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article trouvé</h3>
                <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
