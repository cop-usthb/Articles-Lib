export interface User {
  _id?: string
  email: string
  name: string
  password: string
  interests: string[]
  favorites: string[]
  likes: string[]
  read: string[] // Nouveau champ pour les articles lus
  createdAt?: Date
  updatedAt?: Date
}

export interface UserResponse {
  _id: string
  email: string
  name: string
  interests: string[]
  favorites: string[]
  likes: string[]
  read: string[] // Nouveau champ pour les articles lus
  createdAt?: Date
}
