
const API_KEY = "4d0de3bcc1d64cf2bc0f464545b4eaef"; // Chave fornecida
const API_URL = "https://api.football-data.org/v4/competitions/PL/matches";

async function testApi() {
    console.log(`📡 Testando API Externa para PL (Premier League)...`);
    console.log(`🔑 Usando chave: ${API_KEY.substring(0, 4)}...`);

    try {
        const res = await fetch(API_URL, {
            headers: { "X-Auth-Token": API_KEY }
        });

        console.log(`📊 Status HTTP: ${res.status} ${res.statusText}`);

        if (res.status === 429) {
            console.error("🚨 ERRO 429: Bloqueio de Taxa (Too Many Requests). Espere 1 minuto.");
            console.log("Headers:", Object.fromEntries(res.headers.entries()));
            return;
        }

        if (!res.ok) {
            console.error("❌ Erro na requisição:", await res.text());
            return;
        }

        const data = await res.json();
        const matches = data.matches || [];

        console.log(`✅ Sucesso! Retornados ${matches.length} jogos.`);

        if (matches.length > 0) {
            console.log("Exemplo do primeiro jogo:");
            const m = matches[0];
            console.log(` - Data: ${m.utcDate}`);
            console.log(` - Rodada: ${m.matchday}`);
            console.log(` - Status: ${m.status}`);
            console.log(` - Jogo: ${m.homeTeam?.name} x ${m.awayTeam?.name}`);
        } else {
            console.warn("⚠️ Lista de jogos veio vazia. Talvez filtro de temporada?");
            console.log("Dados recebidos:", JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.error("🔥 Erro fatal no script:", error.message);
    }
}

testApi();
