"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds, format } from "date-fns";

interface CountdownProps {
    targetDate: Date;
    onZero?: () => void;
    variant?: "inline" | "block";
}

export function Countdown({ targetDate, onZero, variant = "inline" }: CountdownProps) {
    const [timeLeft, setTimeLeft] = useState(() => {
        const now = new Date();
        const diff = differenceInSeconds(targetDate, now);
        return Math.max(0, diff);
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = differenceInSeconds(targetDate, now);

            if (diff <= 0) {
                setTimeLeft(0);
                if (onZero) onZero();
                return 0;
            }

            setTimeLeft(diff);
            return diff;
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onZero]);

    if (timeLeft <= 0) return <span className="text-red-600 dark:text-red-500 font-bold text-[10px] animate-pulse">AGUARDANDO</span>;

    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    if (variant === "block") {
        return (
            <div className="flex items-center gap-2 sm:gap-4 text-red-600 dark:text-red-500 animate-pulse mt-2">
                {days > 0 && (
                    <>
                        <div className="flex flex-col items-center">
                            <span className="font-mono font-black text-2xl sm:text-4xl tracking-tighter leading-none">{String(days).padStart(2, '0')}</span>
                            <span className="text-[9px] sm:text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest mt-1">Dias</span>
                        </div>
                        <span className="text-xl sm:text-3xl font-black opacity-30 mb-4 sm:mb-5">:</span>
                    </>
                )}
                <div className="flex flex-col items-center">
                    <span className="font-mono font-black text-2xl sm:text-4xl tracking-tighter leading-none">{String(hours).padStart(2, '0')}</span>
                    <span className="text-[9px] sm:text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest mt-1">Horas</span>
                </div>
                <span className="text-xl sm:text-3xl font-black opacity-30 mb-4 sm:mb-5">:</span>
                <div className="flex flex-col items-center">
                    <span className="font-mono font-black text-2xl sm:text-4xl tracking-tighter leading-none">{String(minutes).padStart(2, '0')}</span>
                    <span className="text-[9px] sm:text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest mt-1">Min</span>
                </div>
                <span className="text-xl sm:text-3xl font-black opacity-30 mb-4 sm:mb-5">:</span>
                <div className="flex flex-col items-center">
                    <span className="font-mono font-black text-2xl sm:text-4xl tracking-tighter leading-none">{String(seconds).padStart(2, '0')}</span>
                    <span className="text-[9px] sm:text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest mt-1">Segs</span>
                </div>
            </div>
        );
    }

    return (
        <span className="font-mono font-bold text-red-600 animate-pulse">
            {days > 0 ? `${String(days).padStart(2, '0')}:` : ''}{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
}
