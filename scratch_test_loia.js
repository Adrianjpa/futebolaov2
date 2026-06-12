const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
  try {
    const loiaEmail = 'lindoaldo@legacy.local';
    const { data: loiaUser } = await supabaseAdmin.from('profiles').select('id').eq('email', loiaEmail).single();
    
    const { data: activeChamps } = await supabaseAdmin.from('championships').select('id, name, settings');
    const loiaChamps = activeChamps?.filter(c => c.settings?.enableLoia === true) || [];
    const champIds = loiaChamps.map(c => c.id);
    
    const now = new Date();
    const nextWindow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    
    const { data: matches } = await supabaseAdmin
        .from('matches')
        .select('id, championship_id, home_team, away_team, date, status')
        .in('championship_id', champIds)
        .eq('status', 'scheduled')
        .gte('date', now.toISOString())
        .lte('date', nextWindow.toISOString());
        
    const matchIds = matches.map(m => m.id);
    const { data: existingPredictions } = await supabaseAdmin
        .from('predictions')
        .select('match_id')
        .eq('user_id', loiaUser.id)
        .in('match_id', matchIds);
        
    const predictedMatchIds = new Set(existingPredictions?.map(p => p.match_id) || []);
    const pendingMatches = matches.filter(m => !predictedMatchIds.has(m.id));
    
    console.log('Pending matches count:', pendingMatches.length);
    if (pendingMatches.length === 0) return;
    
    let promptMatches = pendingMatches.map(m => `Match ID: ${m.id} | ${m.home_team} vs ${m.away_team} | Date: ${m.date}`).join('\n');
    
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const aiResponse = await model.generateContent(prompt);
    let text = aiResponse.response.text();
    console.log('Raw AI Response:', text);
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const predictionsArray = JSON.parse(text);
    console.log('Parsed successfully:', predictionsArray.length, 'predictions');
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}
run();
