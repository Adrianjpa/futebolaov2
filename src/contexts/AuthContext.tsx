"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfile {
    id: string;
    nome: string;
    nickname: string;
    email: string;
    foto_perfil: string | null;
    funcao: "usuario" | "moderator" | "admin";
    status: "ativo" | "pendente" | "bloqueado";
    presence?: "Online" | "Ocupado" | "Não Incomode" | "Invisível" | "Offline";
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", userId)
                    .single();

                if (error) {
                    console.error("Error fetching profile details:", {
                        code: error.code,
                        message: error.message,
                        details: error.details
                    });
                    setProfile(null);
                } else {
                    setProfile(data as UserProfile);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
                setProfile(null);
            }
        };

        // Check active session immediately to catch refresh token errors
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error("Session verification error:", error);
                if (error.message.includes("Refresh Token")) {
                    console.log("Invalid refresh token detected. Force signing out...");
                    supabase.auth.signOut().then(() => {
                        window.location.href = "/login";
                    });
                }
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Handle token refresh errors explicitly
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                try {
                    const { data: profileData, error } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", currentUser.id)
                        .single();

                    if (error || !profileData) {
                        console.error("Profile fetch error:", error);
                        // Only sign out if truly necessary/critical, otherwise might be temp network
                        // For now, if no profile, we just don't set it.
                        setProfile(null);
                    } else {
                        setProfile(profileData as UserProfile);
                    }
                } catch (err) {
                    console.error("Profile fetch exception:", err);
                    setProfile(null);
                } finally {
                    setLoading(false);
                }
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {loading ? (
                <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground animate-pulse font-medium">Verificando autenticação...</p>
                        <p className="text-[10px] text-muted-foreground opacity-50 px-6 max-w-xs">
                            Se demorar muito, sua sessão pode estar expirada após as alterações no banco.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 text-xs"
                        onClick={() => {
                            supabase.auth.signOut().then(() => {
                                window.location.href = "/login";
                            });
                        }}
                    >
                        Limpar Sessão / Sair
                    </Button>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
