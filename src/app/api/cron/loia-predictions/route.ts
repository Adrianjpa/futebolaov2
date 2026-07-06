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
        let officialRankingArray: any[] = [];
        
        const currentChamp = (activeChamps as any[])?.find((c: any) => champIds.includes(c.id));
        if (currentChamp && currentChamp.settings && currentChamp.settings.officialRanking) {
            const ranking = currentChamp.settings.officialRanking;
            officialRankingArray = ranking;
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
- Se você estiver no topo (Top 3), jogue com extrema segurança e lógica. Aposte sempre no favorito.
- Se você estiver no final da tabela (lanterna), PARE de tentar zebras ou empates loucos. Jogue com segurança para garantir pontos básicos (+1). Só faça apostas arriscadas se for um clássico muito equilibrado. Evite empates exatos.

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
        // Protocolo Sombra: Identifica o Top 3 e foca neles
        if (sniperMatches.length > 0) {
            let sniperPrompts = [];
            
            // Extrair os IDs do Top 3
            const top3Ids = officialRankingArray.slice(0, 3).map((r: any) => r.userId);
            
            for (const m of sniperMatches) {
                // Filtra apenas os palpites dos caras que estão no Top 3
                const matchPreds = (existingPredictions as any[]).filter((p: any) => p.match_id === m.id && top3Ids.includes(p.user_id));
                const loiaCurrent = loiaPredictions.find((p: any) => p.match_id === m.id);
                
                if (matchPreds.length > 0) {
                    const opponentScores = matchPreds.map((p: any) => `${p.home_score}x${p.away_score}`).join(", ");
                    sniperPrompts.push(`Match ID: ${m.id} | Jogo: ${m.home_team} vs ${m.away_team} | Seu palpite atual: ${loiaCurrent?.home_score}x${loiaCurrent?.away_score} | Palpites do Top 3 (Os Líderes): ${opponentScores}`);
                }
            }

            if (sniperPrompts.length > 0) {
                const promptSniper = `
Você é o Lindoaldo (Lóia), um estrategista de apostas. Faltam poucos minutos para os jogos começarem.
Sua colocação atual no campeonato é: ${loiaPosition}.
Vou te passar o seu palpite atual e os palpites exclusivos do TOP 3 (os líderes do campeonato) para esse jogo.

PROTOCOLO SOMBRA (Apenas copie os mestres):
1. Você está numa situação onde NÃO DEVE ARRISCAR ZEBRAS. Aja como uma sombra do Top 3.
2. Analise os placares que os líderes escolheram. Eles sabem o que estão fazendo.
3. Escolha EXATAMENTE um dos placares deles para copiar, OU faça uma levíssima variação matemática (ex: se o líder apostou 2x0, você pode colocar 1x0 ou 2x1 para o mesmo time vencedor).
4. ATENÇÃO MÁXIMA: É ESTRITAMENTE PROIBIDO APOSTAR EM EMPATE (0x0, 1x1, 2x2, etc). O empate destruiu seu ranking. Se o líder principal apostou num empate, IGNORE O LÍDER e olhe para o segundo ou terceiro colocado. Ache alguém no Top 3 que apostou numa vitória de um time e copie esse placar de vitória. Garanta pelo menos os pontos de vencedor!
5. REGRA DO ANALISTA FRIO: Se o líder apostou em empate, E o segundo e terceiro colocados também estiverem arriscando zebras absurdas ou placares nada óbvios, ABANDONE O TOP 3. Seja um analista frio e calculista e aposte no time mais ÓBVIO (o franco favorito) para vencer com um placar comum (1x0 ou 2x0). Nunca se junte à loucura deles.

Reavalie seus palpites e forneça os novos placares atualizados baseados na estratégia de "espelhar o mestre" (sem empates) ou, em último caso, no óbvio.

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
            .upsert(formattedInsert as any, { onConflict: "match_id, user_id" });

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
