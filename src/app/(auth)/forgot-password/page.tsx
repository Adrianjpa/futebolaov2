"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });
            if (resetError) throw resetError;
            setSubmitted(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao enviar email. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
            <Card className="w-full max-w-md border-primary/20 shadow-2xl shadow-primary/10">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary p-3 rounded-xl shadow-lg shadow-primary/20">
                            <KeyRound className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
                    <CardDescription>
                        Esqueceu sua senha? Não se preocupe.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {submitted ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex justify-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500" />
                            </div>
                            <h3 className="text-lg font-medium text-green-700">Email Enviado!</h3>
                            <p className="text-sm text-muted-foreground">
                                Verifique sua caixa de entrada (e spam) em <strong>{email}</strong> para redefinir sua senha.
                            </p>
                            <Button asChild className="w-full mt-4 font-bold">
                                <Link href="/">Voltar para Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            {error && <div className="text-red-500 text-sm text-center bg-red-50/10 border border-red-500/20 p-2 rounded">{error}</div>}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email cadastrado</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar Link de Recuperação"}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
