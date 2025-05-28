import { NextResponse } from "next/server"
import { getAllCategories } from "@/lib/db/articles"

export async function GET() {
  try {
    const categories = await getAllCategories()
    return NextResponse.json({ categories: ["Toutes", ...categories] })
  } catch (error) {
    console.error("Categories fetch error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des catégories" }, { status: 500 })
  }
}
