import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { updateUserInterests } from "@/lib/db/users"

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const { interests } = await request.json()

    await updateUserInterests(decoded.userId, interests)

    return NextResponse.json({ message: "Centres d'intérêt mis à jour" })
  } catch (error) {
    console.error("Erreur lors de la mise à jour des centres d'intérêt:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}