"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Rocket, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";

interface WelcomeModalProps {
    onClose?: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notificationId, setNotificationId] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (!user) return;

        // Check for unread 'welcome' notifications
        const checkWelcome = async () => {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .eq("type", 'welcome')
                .eq("read", false)
                .limit(1)
                .single();

            if (data && !error) {
                const welcomeNotif = data as any;
                setNotificationId(welcomeNotif.id);
                setIsOpen(true);
                triggerConfetti();
            }
        };

        checkWelcome();
    }, [user]);

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const handleClose = async () => {
        setIsOpen(false);
        if (notificationId) {
            // Mark as read
            await (supabase.from("notifications") as any)
                .update({ read: true })
                .eq("id", notificationId);
        }
        if (onClose) onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-primary to-blue-500 animate-gradient-x" />

                <div className="flex justify-center mt-4 mb-2">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full ring-8 ring-yellow-50 dark:ring-yellow-900/10">
                        <Trophy className="h-10 w-10 text-yellow-600 dark:text-yellow-400 animate-bounce-slow" />
                    </div>
                </div>

                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                        Bem-vindo ao Time! <PartyPopper className="h-6 w-6 text-yellow-500" />
                    </DialogTitle>
                    <div className="space-y-3 pt-2">
                        <p className="text-muted-foreground">
                            Olá, <span className="font-bold text-foreground">{profile?.nome}</span>!
                            Sua conta foi aprovada com sucesso pelo administrador.
                        </p>
                        <p className="text-sm bg-muted p-3 rounded-lg italic border-l-4 border-primary/50 text-muted-foreground">
                            "O talento vence jogos, mas só o trabalho em equipe ganha campeonatos."
                        </p>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-2 py-4">
                    <p className="text-sm font-medium">O que fazer agora?</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-center justify-center gap-2">🎯 <strong>Palpite</strong> nos jogos da rodada</li>
                        <li className="flex items-center justify-center gap-2">🏆 <strong>Acompanhe</strong> sua posição no Ranking</li>
                        <li className="flex items-center justify-center gap-2">💬 <strong>Interaja</strong> com a galera no chat</li>
                    </ul>
                </div>

                <DialogFooter className="sm:justify-center">
                    <Button onClick={handleClose} size="lg" className="w-full sm:w-auto min-w-[200px] font-bold gap-2 group">
                        Começar a Jogar
                        <Rocket className="h-4 w-4 group-hover:-translate-y-1 transition-transform" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
