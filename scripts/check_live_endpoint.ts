
const API_KEY = "4d0de3bcc1d64cf2bc0f464545b4eaef";
const URL = "https://api.football-data.org/v4/matches";

async function checkEndpoint() {
    console.log(`🕵️ Consultando Endpoint Geral: ${URL}`);

    const res = await fetch(URL, {
        headers: { "X-Auth-Token": API_KEY }
    });

    if (!res.ok) {
        console.error("❌ Erro API:", res.status, res.statusText);
        // Se der erro, tenta ler o corpo para ver se tem mensagem
        const text = await res.text();
        console.error("Detalhes:", text);
        return;
    }

    const data: any = await res.json();
    const matches = data.matches || [];

    console.log(`\n📥 Total de jogos retornados HOJE/RECENTE: ${matches.length}`);
    console.log(`📅 Filtros aplicados pela API: ${JSON.stringify(data.filters)}\n`);

    if (matches.length === 0) {
        console.log("⚠️ Nenhum jogo retornado na lista padrão.");
        return;
    }

    // Listar todos para ver o status real
    matches.forEach((m: any) => {
        const home = m.homeTeam.shortName || m.homeTeam.name;
        const away = m.awayTeam.shortName || m.awayTeam.name;
        const score = `${m.score.fullTime.home ?? '-'} x ${m.score.fullTime.away ?? '-'}`;
        const time = new Date(m.utcDate).toLocaleTimeString('pt-BR', { timeZone: 'UTC' }); // Mostrando UTC original para não confundir

        // Cores simples para o log
        let icon = "⚪"; // Scheduled
        if (m.status === 'FINISHED') icon = "✅";
        if (m.status === 'IN_PLAY' || m.status === 'PAUSED') icon = "🔴";

        console.log(`${icon} [${m.status}] ${time} UTC | ${home} ${score} ${away} (ID: ${m.id})`);
    });
}

checkEndpoint();
