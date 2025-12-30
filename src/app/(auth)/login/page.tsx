"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    // Effect to load remembered email
    useState(() => {
        if (typeof window !== "undefined") {
            const savedEmail = localStorage.getItem("rememberedEmail");
            if (savedEmail) {
                setEmail(savedEmail);
            }
        }
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Handle email remembering
        if (typeof window !== "undefined") {
            if (rememberMe) {
                localStorage.setItem("rememberedEmail", email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }
        }

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao fazer login. Verifique suas credenciais.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (authError) throw authError;
        } catch (err: any) {
            setError("Erro ao fazer login com Google.");
        }
    };

    return (
        <Card className="border-primary/20 shadow-2xl shadow-primary/10">
            <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                    {/* Light Mode - Colored Shield */}
                    <div className="dark:hidden h-16 w-16">
                        <img src="/images/logo-shield-color.png" alt="FuteBolão" className="h-full w-full object-contain" />
                    </div>
                    {/* Dark Mode - White Shield */}
                    <div className="hidden dark:block h-16 w-16">
                        <img src="/images/logo-shield-white.png" alt="FuteBolão" className="h-full w-full object-contain" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
                <CardDescription>
                    Entre na sua conta para continuar
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="remember"
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(!!checked)}
                            />
                            <Label
                                htmlFor="remember"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lembrar-me
                            </Label>
                        </div>
                        <Link
                            href="/forgot-password"
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            Esqueceu a senha?
                        </Link>
                    </div>

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                        {loading ? "Entrando..." : "Entrar"}
                    </Button>
                </form>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                            Ou continue com
                        </span>
                    </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                    </svg>
                    Google
                </Button>
            </CardContent>
            <CardFooter className="flex justify-center">
                <div className="text-sm text-muted-foreground">
                    Não tem uma conta?{" "}
                    <Link href="/register" className="text-primary hover:underline font-medium">
                        Cadastre-se
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
