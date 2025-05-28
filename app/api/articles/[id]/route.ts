import { NextRequest, NextResponse } from "next/server"
import { getArticleById } from "@/lib/db/articles"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const article = await getArticleById(id)

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error("Article fetch error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération de l'article" }, { status: 500 })
  }
}
