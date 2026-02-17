'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "./actions"

export function LoginForm() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)

        try {
            const result = await login(formData)

            if (result?.error) {
                setError(result.error)
                setLoading(false)
            } else if (result?.success) {
                router.push('/calendar')
                router.refresh() // Ensure middleware re-runs / clean state
            }
        } catch (e) {
            console.error("Client login error:", e)
            setError("Error inesperado. Inténtalo de nuevo.")
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-pink-500">
            <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-6 h-6 text-pink-600"
                    >
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                        <path d="M8.5 8.5a2.5 2.5 0 0 1 0 5" />
                        <path d="M15.5 15.5a2.5 2.5 0 0 1 0-5" />
                    </svg>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                    Delos<span className="text-pink-500">Beauty</span>Manager
                </CardTitle>
                <CardDescription>
                    Acceso exclusivo para personal autorizado
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="usuario@delos.com"
                            required
                            disabled={loading}
                            className="bg-slate-50 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            disabled={loading}
                            className="bg-slate-50 focus:bg-white transition-colors"
                        />
                    </div>
                    {error && (
                        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white transition-all shadow hover:shadow-lg"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Entrando...
                            </div>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
