"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStatusProps {
    isRead: boolean;
    isDelivered?: boolean; // Optional for backward compatibility if needed, but best if passed
    className?: string;
}

export function MessageStatus({ isRead, isDelivered, className }: MessageStatusProps) {
    // Logic:
    // If read: Double Check Blue
    // If delivered: Double Check Gray
    // Else: Single Check Gray

    if (isRead) {
        return (
            <div className={cn("flex items-center ml-1", className)} title="Lida">
                <CheckCheck className="w-3 h-3 md:w-4 md:h-4 text-blue-500 dark:text-blue-400" />
            </div>
        );
    }

    if (isDelivered) {
        return (
            <div className={cn("flex items-center ml-1", className)} title="Entregue">
                <CheckCheck className="w-3 h-3 md:w-4 md:h-4 text-slate-400 dark:text-slate-500" />
            </div>
        );
    }

    return (
        <div className={cn("flex items-center ml-1", className)} title="Enviada">
            <Check className="w-3 h-3 md:w-4 md:h-4 text-slate-400 dark:text-slate-500" />
        </div>
    );
}
