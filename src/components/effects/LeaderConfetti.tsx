"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown } from "lucide-react";
import { RocketIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderConfettiProps {
    leadersMap: Record<string, any>;
    championshipsMap: Record<string, any>;
}

export function LeaderConfetti({ leadersMap, championshipsMap }: LeaderConfettiProps) {
    const { user, profile } = useAuth();
    const [leaderChampionships, setLeaderChampionships] = useState<any[]>([]);
    const [hasTriggered, setHasTriggered] = useState(false);

    useEffect(() => {
        if (!user || Object.keys(leadersMap).length === 0) return;

        const myLeaderChamps: any[] = [];
        Object.entries(leadersMap).forEach(([champId, leaderData]) => {
            // Check if current user is the leader
            if (leaderData.user_id === user.id) {
                myLeaderChamps.push({
                    id: champId,
                    name: championshipsMap[champId]?.name || "Campeonato",
                    points: leaderData.total_points
                });
            }
        });

        setLeaderChampionships(myLeaderChamps);

        if (myLeaderChamps.length > 0 && !hasTriggered) {
            setHasTriggered(true);

            // Trigger confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);
        }

    }, [leadersMap, user, championshipsMap, hasTriggered]);

    if (leaderChampionships.length === 0 && profile?.funcao !== 'admin') return null;

    // Mobile First Card
    return (
        <div className="w-full mb-6 animate-in slide-in-from-top-4 duration-700">
            {/* Admin Debug / Preview (Only visible if NOT leader, so admin can force test) */}
            {profile?.funcao === 'admin' && leaderChampionships.length === 0 && (
                <div className="mb-4 p-3 bg-secondary/50 border border-secondary rounded-lg text-xs text-muted-foreground flex justify-between items-center">
                    <span className="font-medium">🛠️ Admin Preview (Confetes)</span>
                    <button
                        onClick={() => {
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 }
                            });
                        }}
                        className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-bold hover:bg-primary/90 transition-colors"
                    >
                        Testar Animação
                    </button>
                </div>
            )}

            {leaderChampionships.map((champ, idx) => (
                <Card key={idx} className="bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-yellow-400/10 border-yellow-400/30 shadow-sm relative overflow-hidden mb-4 transform transition-all hover:scale-[1.02]">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-500/10 to-transparent animate-pulse" />

                    <CardContent className="p-4 flex items-center gap-4 relative z-10">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0 animate-bounce">
                            <RocketIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-sm sm:text-base font-bold text-yellow-700 dark:text-yellow-400 leading-tight truncate">
                                    Líder do Ranking!
                                </h3>
                                <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                                {champ.name} • <span className="text-foreground font-bold">{champ.points} pts</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
