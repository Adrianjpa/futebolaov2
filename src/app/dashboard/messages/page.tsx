"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MessagesPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mensagens</h1>
                <p className="text-muted-foreground">Comunicação direta com a administração e outros participantes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Conversation List (Placeholder) */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Conversas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex flex-col">
                            <div className="p-4 border-l-4 border-primary bg-primary/5 cursor-pointer">
                                <p className="font-bold text-sm">Suporte / Admin</p>
                                <p className="text-xs text-muted-foreground truncate italic">Funcionalidade em desenvolvimento...</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Chat Area (Placeholder) */}
                <Card className="md:col-span-2 min-h-[500px] flex flex-col">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg">Suporte / Admin</CardTitle>
                        <CardDescription>Envie suas dúvidas ou sugestões para a nossa equipe.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-6">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center opacity-50">
                            <MessageSquare className="h-10 w-10" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-foreground">Sistema de Mensagens</p>
                            <p className="text-sm max-w-xs mx-auto">Em breve você poderá conversar diretamente com o administrador para resolver problemas ou sugerir melhorias.</p>
                        </div>
                    </CardContent>
                    <div className="p-4 border-t flex gap-2">
                        <Input placeholder="Digite sua mensagem..." disabled />
                        <Button size="icon" disabled>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
