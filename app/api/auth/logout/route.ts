import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ message: "Déconnecté avec succès" })
  response.cookies.delete("token")
  return response
}
