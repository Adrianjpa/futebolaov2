"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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
            setLoading(false);

            if (currentUser) {
                fetchProfile(currentUser.id);
            } else {
                setProfile(null);
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
                    <p className="text-sm text-muted-foreground animate-pulse font-medium">Verificando autenticação...</p>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
