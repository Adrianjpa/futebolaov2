import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
    // Basic Security Check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const testUsers = [
            {
                nome: "Neymar Jr (Fake)",
                nickname: "neyjr_fake",
                email: "neymar.fake@exemplo.com",
            },
            {
                nome: "Vini Jr (Fake)",
                nickname: "vinijr_fake",
                email: "vini.fake@exemplo.com",
            },
            {
                nome: "Marta (Fake)",
                nickname: "marta_fake",
                email: "marta.fake@exemplo.com",
            },
            {
                nome: "Pelé Eterno",
                nickname: "rei_pele",
                email: "pele.fake@exemplo.com",
            },
            {
                nome: "Formiga (Fake)",
                nickname: "formiga_fake",
                email: "formiga.fake@exemplo.com",
            }
        ];

        let createdCount = 0;

        for (const user of testUsers) {
            // 1. Check if user already exists in profiles
            const { data: existing } = await (supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', user.email)
                .single() as any);

            if (!existing) {
                // 2. Create in Auth (which triggers Profile creation)
                const { error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: user.email,
                    password: 'password123', // Dummy password
                    email_confirm: true,
                    user_metadata: {
                        nome: user.nome,
                        nickname: user.nickname
                    }
                });

                if (authError) {
                    console.error(`Error creating auth user ${user.email}:`, authError);
                } else {
                    createdCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `${createdCount} usuários de teste processados com sucesso!`,
            count: createdCount
        });

    } catch (error: any) {
        console.error("Erro ao criar usuários de teste:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
