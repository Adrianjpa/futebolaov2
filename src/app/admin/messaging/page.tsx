"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Send, Users, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminMessagingPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mensagens (Admin)</h1>
                <p className="text-muted-foreground">Gerencie o suporte e a comunicação com todos os usuários.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Conversas com Usuários
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-8 text-center text-muted-foreground italic text-sm">
                            Nenhuma conversa ativa no momento.
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 min-h-[500px] flex flex-col items-center justify-center text-muted-foreground gap-4 border-dashed border-2">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center opacity-50">
                        <ShieldAlert className="h-10 w-10 text-primary" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-foreground">Central de Mensagens Administrativas</p>
                        <p className="text-sm max-w-sm mx-auto mt-2">
                            Esta área permitirá que você responda chamados, envie comunicados globais e gerencie a comunicação interna do FuteBolão.
                        </p>
                        <Button className="mt-6" variant="outline" disabled>
                            Funcionalidade em Desenvolvimento
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
