import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel Hobby
import { supabaseAdmin } from "@/lib/supabase-server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa a API do Gemini
// A chave deve estar nas variáveis de ambiente da Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function GET(request: Request) {
    // 1. Verificação de Segurança (Cron Secret)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Verificar se a chave do Gemini existe
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        // 1. Encontrar o usuário Loia pelo email
        const loiaEmail = "lindoaldo@legacy.local";
        const { data: loiaUser } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", loiaEmail)
            .single();

        if (!loiaUser) {
            return NextResponse.json({ success: false, error: "Usuário Loia não encontrado" });
        }

        // 2. Buscar Campeonatos com enableLoia ativado
        const { data: activeChamps } = await supabaseAdmin
            .from("championships")
            .select("id, name, settings");

        const loiaChamps = (activeChamps as any[])?.filter((c: any) => c.settings?.enableLoia === true) || [];
        if (loiaChamps.length === 0) {
            return NextResponse.json({ success: true, message: "Nenhum campeonato com Loia ativado." });
        }

        const champIds = loiaChamps.map((c: any) => c.id);

        // 3. Buscar jogos "agendados" (scheduled) nas próximas 96 horas (4 dias) para esses campeonatos
        const now = new Date();
        const nextWindow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

        const { data: matches } = await supabaseAdmin
            .from("matches")
            .select("id, championship_id, home_team, away_team, date, status")
            .in("championship_id", champIds)
            .eq("status", "scheduled")
            .gte("date", now.toISOString())
            .lte("date", nextWindow.toISOString());

        if (!matches || matches.length === 0) {
            return NextResponse.json({ success: true, message: "Sem jogos na janela de 4 dias." });
        }

        // 4. Filtrar jogos que o Loia JÁ palpitou para não repetir
        const matchIds = (matches as any[]).map((m: any) => m.id);
        const { data: existingPredictions } = await supabaseAdmin
            .from("predictions")
            .select("match_id")
            .eq("user_id", (loiaUser as any).id)
            .in("match_id", matchIds);

        const predictedMatchIds = new Set((existingPredictions as any[])?.map((p: any) => p.match_id) || []);
        const pendingMatches = (matches as any[]).filter((m: any) => !predictedMatchIds.has(m.id));

        if (pendingMatches.length === 0) {
            return NextResponse.json({ success: true, message: "Loia já palpitou em todos os jogos dos próximos 4 dias." });
        }

        // 5. Preparar prompt para o Gemini
        // O ideal aqui seria buscar a posição do Loia no Ranking. Para simplificar nesta versão inicial:
        // Assumimos um comportamento padrão inteligente. (Podemos evoluir o prompt no futuro).
        
        let promptMatches = pendingMatches.map((m: any) => `Match ID: ${m.id} | ${m.home_team} vs ${m.away_team} | Date: ${m.date}`).join("\n");
        
        const prompt = `
Você é o Lindoaldo (apelido: Loia), um analista e apostador fanático de futebol.
Você tem uma preferência emocional pela Seleção Argentina.

Analise as seguintes partidas e me forneça o placar exato mais provável e lógico para cada uma,
mas adicione seu viés de sempre favorecer um pouco a Argentina se ela estiver jogando.
Não tente ser aleatório, use análise de força das seleções.

Retorne APENAS um JSON estrito no seguinte formato, sem formatação markdown ou texto extra:
[
  { "match_id": "ID", "home_score": 1, "away_score": 0 }
]

Partidas:
${promptMatches}
`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const aiResponse = await model.generateContent(prompt);
        let text = aiResponse.response.text();
        
        // Limpar possíveis formatações markdown do JSON
        text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const predictionsArray = JSON.parse(text);

        // 6. Inserir os palpites no banco
        const predictionsToInsert = predictionsArray.map((p: any) => ({
            match_id: p.match_id,
            user_id: (loiaUser as any).id,
            home_score: p.home_score,
            away_score: p.away_score
        }));

        const { error: insertError } = await supabaseAdmin
            .from("predictions")
            .upsert(predictionsToInsert, { onConflict: "match_id, user_id" });

        if (insertError) throw insertError;

        return NextResponse.json({ 
            success: true, 
            message: `Loia fez palpites em ${predictionsToInsert.length} jogos.`,
            predictions: predictionsToInsert
        });

    } catch (error: any) {
        console.error("Error in Loia predictions cron:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
