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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                // Fetch profile
                supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", currentUser.id)
                    .single()
                    .then(({ data: profileData, error }) => {
                        if (error || !profileData) {
                            console.error("Profile not found or error:", error);
                            setProfile(null);

                            // For manual deletions or stale sessions: 
                            // if we can't find a profile for a logged-in user, sign out to clear the session.
                            // We don't sign out during initial signup (handled by the flow)
                            if (event !== 'SIGNED_IN') {
                                supabase.auth.signOut().then(() => setLoading(false));
                            } else {
                                setLoading(false);
                            }
                        } else {
                            setProfile(profileData as UserProfile);
                            setLoading(false);
                        }
                    });
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
