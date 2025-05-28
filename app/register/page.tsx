"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, User, Heart, ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  interests: string[]
}

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [availableTopics, setAvailableTopics] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    interests: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  // Récupérer les topics depuis la base de données
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setTopicsLoading(true)
        const response = await fetch('/api/topics')
        if (response.ok) {
          const data = await response.json()
          console.log('Topics data:', data) // Pour déboguer
          
          // Utiliser UNIQUEMENT les topics (pas allInterests)
          setAvailableTopics(data.topics || [])
        } else {
          const errorData = await response.json()
          console.error('Failed to fetch topics:', errorData)
          setAvailableTopics([])
        }
      } catch (error) {
        console.error('Error fetching topics:', error)
        setAvailableTopics([])
      } finally {
        setTopicsLoading(false)
      }
    }

    fetchTopics()
  }, [])

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis"
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Format d'email invalide"
    }

    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis"
    } else if (formData.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          interests: formData.interests,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/login?message=Inscription réussie ! Vous pouvez maintenant vous connecter.")
      } else {
        setErrors({ general: data.error || "Une erreur est survenue" })
      }
    } catch (error) {
      setErrors({ general: "Une erreur est survenue" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center items-center mb-6">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-2xl font-bold text-gray-900">ScienceLib</span>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Créer votre compte
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ou{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            connectez-vous à votre compte existant
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              {step === 1 ? (
                <>
                  <User className="h-5 w-5 mr-2" />
                  Informations personnelles
                </>
              ) : (
                <>
                  <Heart className="h-5 w-5 mr-2" />
                  Centres d'intérêt
                </>
              )}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 1 
                ? "Renseignez vos informations de base"
                : "Sélectionnez vos domaines d'intérêt (optionnel)"
              }
            </CardDescription>
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <div className={`h-2 w-8 rounded ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`h-2 w-8 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {step === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6">
                <div>
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
                </div>

                <Button type="submit" className="w-full">
                  Suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label className="text-base font-medium">
                    Sélectionnez vos centres d'intérêt
                  </Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Cela nous aidera à personnaliser votre expérience
                  </p>
                  
                  {topicsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Chargement des domaines...</span>
                    </div>
                  ) : availableTopics.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Aucun centre d'intérêt disponible</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Vous pourrez les configurer plus tard dans votre profil
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                      {availableTopics.map((topic) => (
                        <div key={topic} className="flex items-center space-x-3">
                          <Checkbox
                            id={topic}
                            checked={formData.interests.includes(topic)}
                            onCheckedChange={() => handleInterestToggle(topic)}
                          />
                          <Label
                            htmlFor={topic}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {topic}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formData.interests.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>{formData.interests.length}</strong> centre{formData.interests.length > 1 ? 's' : ''} d'intérêt sélectionné{formData.interests.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {errors.general && (
                  <div className="text-sm text-red-600 text-center">
                    {errors.general}
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer le compte"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
