import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logActivity } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, nome, nickname, foto_perfil } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        const { data, error } = await (supabaseAdmin.from('profiles') as any).update({
            nome,
            nickname: nickname?.trim() || null,
            foto_perfil
        }).eq('id', userId);

        if (error) {
            console.error("Supabase Admin Error updating profile:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Registrando no banco de logs
        await logActivity(supabaseAdmin, userId, 'update_profile', { nome, nickname });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("API Route Error updating profile:", error);
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
}
