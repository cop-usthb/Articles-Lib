import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { findUserById, updateUser } from "@/lib/db/users"
import { getArticlesByIds } from "@/lib/db/articles"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 })
    }

    const user = await findUserById(decoded.userId)
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    const articles = await getArticlesByIds(user.favorites)

    return NextResponse.json({ articles })
  } catch (error) {
    console.error("Favorites fetch error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des favoris" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 })
    }

    const { articleId } = await request.json()

    const user = await findUserById(decoded.userId)
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    const favorites = user.favorites.includes(articleId)
      ? user.favorites.filter((id) => id !== articleId)
      : [...user.favorites, articleId]

    const updatedUser = await updateUser(decoded.userId, { favorites })

    return NextResponse.json({
      user: updatedUser,
      isFavorite: favorites.includes(articleId),
    })
  } catch (error) {
    console.error("Favorite toggle error:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour des favoris" }, { status: 500 })
  }
}
