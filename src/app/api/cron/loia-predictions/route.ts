import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel Hobby
import { supabaseAdmin } from "@/lib/supabase-server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logActivity } from "@/lib/logger";

// Inicializa a API do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function GET(request: Request) {
    // 1. Verificação de Segurança (Cron Secret)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        const loiaEmail = "lindoaldo@legacy.local";
        const { data: loiaUser } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", loiaEmail)
            .single();

        if (!loiaUser) {
            return NextResponse.json({ success: false, error: "Usuário Loia não encontrado" });
        }

        const { data: activeChamps } = await supabaseAdmin
            .from("championships")
            .select("id, name, settings");

        const loiaChamps = (activeChamps as any[])?.filter((c: any) => c.settings?.enableLoia === true) || [];
        if (loiaChamps.length === 0) {
            return NextResponse.json({ success: true, message: "Nenhum campeonato com Loia ativado." });
        }

        const champIds = loiaChamps.map((c: any) => c.id);

        const now = new Date();
        const window24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const window1h = new Date(now.getTime() + 60 * 60 * 1000); // Janela Sniper de 1 hora

        // Buscar apenas jogos "scheduled" (ainda não começaram e não finalizaram)
        const { data: matches } = await supabaseAdmin
            .from("matches")
            .select("id, championship_id, home_team, away_team, date, status")
            .in("championship_id", champIds)
            .eq("status", "scheduled")
            .gte("date", now.toISOString())
            .lte("date", window24h.toISOString());

        if (!matches || matches.length === 0) {
            return NextResponse.json({ success: true, message: "Sem jogos na janela de 24 horas." });
        }

        const matchIds = (matches as any[]).map((m: any) => m.id);
        const { data: existingPredictions } = await supabaseAdmin
            .from("predictions")
            .select("*")
            .in("match_id", matchIds);

        const loiaPredictions = (existingPredictions as any[])?.filter((p: any) => p.user_id === (loiaUser as any).id) || [];
        const loiaPredictedMatchIds = new Set(loiaPredictions.map((p: any) => p.match_id));

        // Separar jogos para o Palpite Base (na janela 24h que ele ainda não palpitou)
        const pendingBaseMatches = (matches as any[]).filter((m: any) => !loiaPredictedMatchIds.has(m.id));

        // Separar jogos para a Análise Sniper (na janela de <= 1h que ele JÁ palpitou e ainda está scheduled)
        const sniperMatches = (matches as any[]).filter((m: any) => {
            const matchDate = new Date(m.date);
            return matchDate <= window1h && loiaPredictedMatchIds.has(m.id);
        });

        let predictionsToInsert: any[] = [];
        let messages = [];

        // Encontrar a posição real do Loia no ranking oficial (se disponível)
        let loiaPosition = "no meio da tabela";
        let totalParticipants = 10;
        const currentChamp = activeChamps.find((c: any) => champIds.includes(c.id));
        if (currentChamp && currentChamp.settings && currentChamp.settings.officialRanking) {
            const ranking = currentChamp.settings.officialRanking;
            totalParticipants = ranking.length;
            const idx = ranking.findIndex((r: any) => r.userId === (loiaUser as any).id);
            if (idx !== -1) {
                loiaPosition = `${idx + 1}º lugar (de ${totalParticipants})`;
            }
        }

        // --- ETAPA 1: PALPITE BASE ---
        if (pendingBaseMatches.length > 0) {
            let promptMatches = pendingBaseMatches.map((m: any) => `Match ID: ${m.id} | ${m.home_team} vs ${m.away_team} | Date: ${m.date}`).join("\n");
            const promptBase = `
Você é o Lindoaldo (apelido: Loia), um analista e apostador fanático de futebol.
Você tem uma preferência emocional pela Seleção Argentina.

Sua colocação atual no campeonato é: ${loiaPosition}.
Sua estratégia deve se adaptar a essa posição:
- Se você estiver no topo (Top 3), jogue com segurança e lógica.
- Se você estiver no meio ou no final da tabela, assuma riscos calculados em placares um pouco mais ousados para buscar cravadas exclusivas, mas sem loucuras.

Lembre-se de que os jogos de mata-mata englobam os 90 minutos + 30 de prorrogação. Empates são perfeitamente possíveis.
Analise as seguintes partidas e forneça o placar exato para cada uma, favorecendo um pouquinho a Argentina caso ela jogue.

Retorne APENAS um JSON estrito no seguinte formato, sem formatação markdown ou texto extra:
[
  { "match_id": "ID", "home_score": 1, "away_score": 0 }
]

Partidas:
${promptMatches}
`;
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            let predsBase = await fetchFromGemini(model, promptBase);
            if (predsBase) {
                predictionsToInsert = [...predictionsToInsert, ...predsBase];
                messages.push(`Palpite base (24h) feito em ${predsBase.length} jogos.`);
            }
        }

        // --- ETAPA 2: ANÁLISE SNIPER (1h antes do jogo) ---
        // Analisa TODOS os outros palpites existentes para o jogo e tenta fugir da "massa"
        if (sniperMatches.length > 0) {
            let sniperPrompts = [];
            
            for (const m of sniperMatches) {
                const matchPreds = (existingPredictions as any[]).filter((p: any) => p.match_id === m.id && p.user_id !== (loiaUser as any).id);
                const loiaCurrent = loiaPredictions.find((p: any) => p.match_id === m.id);
                
                if (matchPreds.length > 0) {
                    const opponentScores = matchPreds.map((p: any) => `${p.home_score}x${p.away_score}`).join(", ");
                    sniperPrompts.push(`Match ID: ${m.id} | Jogo: ${m.home_team} vs ${m.away_team} | Seu palpite atual: ${loiaCurrent?.home_score}x${loiaCurrent?.away_score} | Palpites dos adversários (Massa): ${opponentScores}`);
                }
            }

            if (sniperPrompts.length > 0) {
                const promptSniper = `
Você é o Lindoaldo (Lóia), um estrategista de apostas. Faltam poucos minutos para os jogos começarem.
Sua colocação atual no campeonato é: ${loiaPosition}.
Vou te passar o seu palpite atual e todos os palpites que os seus adversários já registraram para esse mesmo jogo.

Sua missão é ler o jogo:
1. Você NÃO precisa escolher um placar totalmente inédito se as opções restantes forem absurdas (ex: 5x1). É permitido repetir palpites de adversários se for matematicamente a melhor escolha.
2. Se você estiver LIDERANDO o campeonato (Top 1 a 3), jogue com segurança. Marque de perto os adversários e aposte no mais óbvio.
3. Se você estiver ATRÁS na tabela, analise a "massa": se todos apostaram no mesmo placar óbvio (ex: 2x0), tente um desvio leve e inteligente (ex: 2x1, 1x0 ou 1x1) para tentar a "bucha" exclusiva e pular na frente.
Lembre-se: jogos de mata-mata englobam prorrogação, empates existem.

Reavalie seus palpites e forneça os novos placares atualizados baseados nessa espionagem. Você PODE mudar o placar ou mantê-lo exatamente igual se achar que já está com a melhor aposta.

Retorne APENAS um JSON estrito no seguinte formato, sem formatação markdown ou texto extra:
[
  { "match_id": "ID", "home_score": 1, "away_score": 0 }
]

Cenários Sniper:
${sniperPrompts.join("\n\n")}
`;
                const modelSniper = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                let predsSniper = await fetchFromGemini(modelSniper, promptSniper);
                if (predsSniper) {
                    predictionsToInsert = [...predictionsToInsert, ...predsSniper];
                    messages.push(`Análise Sniper (1h) reajustou palpites em ${predsSniper.length} jogos.`);
                }
            }
        }

        if (predictionsToInsert.length === 0) {
             return NextResponse.json({ success: true, message: "Sem jogos para palpitar ou reavaliar no momento." });
        }

        const formattedInsert = predictionsToInsert.map((p: any) => ({
            match_id: p.match_id,
            user_id: (loiaUser as any).id,
            home_score: p.home_score,
            away_score: p.away_score
        }));

        const { error: insertError } = await supabaseAdmin
            .from("predictions")
            .upsert(formattedInsert, { onConflict: "match_id, user_id" });

        if (insertError) throw insertError;

        await logActivity(supabaseAdmin, (loiaUser as any).id, "CRON_LOIA_SUCCESS", { count: formattedInsert.length });

        return NextResponse.json({ 
            success: true, 
            message: messages.join(" | "),
            predictions: formattedInsert
        });

    } catch (error: any) {
        console.error("Error in Loia predictions cron:", error);
        try {
            await logActivity(supabaseAdmin, '00000000-0000-0000-0000-000000000000', "CRON_LOIA_ERROR", { error: error.message, stack: error.stack });
        } catch (e) {}
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

async function fetchFromGemini(model: any, prompt: string) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const aiResponse = await model.generateContent(prompt);
            let text = aiResponse.response.text();
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        } catch (err: any) {
            lastError = err;
            if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000)); 
            }
        }
    }
    console.error("Gemini failed after 3 attempts:", lastError?.message);
    return null;
}
