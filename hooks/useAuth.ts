"use client"

import { useState, useEffect, useCallback } from "react"
import type { UserResponse } from "@/lib/models/User"

export function useAuth() {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error)
    }

    setUser(data.user)
    return data.user
  }

  const register = async (name: string, email: string, password: string, interests: string[]) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, interests }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error)
    }

    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
  }

  const updateProfile = async (updates: Partial<UserResponse>) => {
    const response = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error)
    }

    setUser(data.user)
    return data.user
  }

  const toggleLike = async (articleId: string) => {
    const response = await fetch("/api/user/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error)
    }

    setUser(data.user)
    return data.isLiked
  }

  const toggleFavorite = async (articleId: string) => {
    const response = await fetch("/api/user/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error)
    }

    setUser(data.user)
    return data.isFavorite
  }

  const markAsRead = useCallback(async (articleId: string) => {
    try {
      const response = await fetch("/api/user/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articleId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
        }
      }
    } catch (error) {
      console.error("Failed to mark article as read:", error)
    }
  }, []) // Mémoriser la fonction

  return {
    user,
    loading,
    login,
    logout,
    toggleLike,
    toggleFavorite,
    markAsRead,
  }
}
