import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { createUser, findUserByEmail } from "@/lib/db/users"
import { updateUserProfilesAsync } from "@/lib/updateUserProfiles"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, interests } = await request.json()

    // Validation des données
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      interests: interests || [],
      favorites: [],
      likes: [],
      read: []
    })

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    )

    // Déclencher la mise à jour des profils utilisateurs en arrière-plan
    updateUserProfilesAsync('user_created')

    // Créer la réponse avec le cookie
    const response = NextResponse.json(
      {
        message: "Inscription réussie",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          interests: user.interests,
          favorites: user.favorites,
          likes: user.likes,
          read: user.read
        }
      },
      { status: 201 }
    )

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 // 7 jours
    })

    return response

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    )
  }
}
