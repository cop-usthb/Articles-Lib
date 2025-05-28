import { type NextRequest, NextResponse } from "next/server"
import { getArticles } from "@/lib/db/articles"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || undefined
    const category = searchParams.get("category") || undefined

    const { articles, total } = await getArticles(page, limit, search, category)

    return NextResponse.json({
      articles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Articles fetch error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des articles" }, { status: 500 })
  }
}
