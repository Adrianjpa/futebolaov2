
import { createClient } from '@supabase/supabase-js';
import { WORLD_CUP_2018_DATA } from '../src/data/legacy/worldcup2018_data';
import { calculatePoints } from '../src/lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getTeamIso(name: string): string {
    const map: Record<string, string> = {
        'Rússia': 'ru', 'Arábia Saudita': 'sa', 'Egito': 'eg', 'Uruguai': 'uy',
        'Marrocos': 'ma', 'Irã': 'ir', 'Portugal': 'pt', 'Espanha': 'es',
        'França': 'fr', 'Austrália': 'au', 'Argentina': 'ar', 'Islândia': 'is',
        'Peru': 'pe', 'Dinamarca': 'dk', 'Croácia': 'hr', 'Nigéria': 'ng',
        'Costa Rica': 'cr', 'Sérvia': 'rs', 'Alemanha': 'de', 'México': 'mx',
        'Brasil': 'br', 'Suíça': 'ch', 'Suécia': 'se', 'Coréia do Sul': 'kr',
        'Bélgica': 'be', 'Panamá': 'pa', 'Tunísia': 'tn', 'Inglaterra': 'gb-eng',
        'Colômbia': 'co', 'Japão': 'jp', 'Polônia': 'pl', 'Senegal': 'sn'
    };
    return map[name] || 'xx';
}

function getRoundNumber(phase: string): number {
    const map: Record<string, number> = {
        'Fase de Grupos': 1,
        'Oitavas de Final': 2,
        'Quartas de Final': 3,
        'Semifinal': 4,
        '3º Lugar': 5,
        'Final': 6
    };
    return map[phase] || 1;
}

async function importWC2018() {
    console.log('🚀 Iniciando Migração Copa 2018...');

    // 1. Localizar Campeonato
    const { data: champ } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', `%${WORLD_CUP_2018_DATA.championshipName}%`)
        .single();

    if (!champ) {
        console.error('❌ Campeonato "Copa do Mundo 2018" não encontrado. Crie-o no admin primeiro!');
        return;
    }

    const scoringRules = {
        exactScorePoints: champ.settings?.exactScorePoints || 3,
        winnerPoints: champ.settings?.winnerPoints || 1
    };
    console.log(`📏 Usando Regras: Bucha=${scoringRules.exactScorePoints}, Situação=${scoringRules.winnerPoints}`);

    // Limpeza (Lembrando que é uma migração limpa)
    console.log('🧹 Limpando dados antigos...');
    await supabase.from('matches').delete().eq('championship_id', champ.id);

    // 2. Times
    console.log('🏟️ Sincronizando Times...');
    const teamMap = new Map<string, string>();
    for (const [sigla, nome] of Object.entries(WORLD_CUP_2018_DATA.teams)) {
        const iso = getTeamIso(nome);
        const { data: team } = await supabase.from('teams').upsert({
            name: nome, short_name: sigla, crest_url: `https://flagcdn.com/w320/${iso}.png`
        }, { onConflict: 'name' }).select('id').single();
        if (team) teamMap.set(sigla, team.id);
    }

    // 3. Usuários (Legados -> Auth)
    console.log('👥 Sincronizando Usuários...');
    const userMap = new Map<string, string>();
    const participantsList: any[] = [];

    for (const userName of WORLD_CUP_2018_DATA.users) {
        let { data: profile } = await supabase.from('profiles').select('*').eq('nickname', userName).maybeSingle();

        if (!profile) {
            console.log(`👻 Criando usuário legado: ${userName}`);
            const email = `${userName.toLowerCase().replace(/\s+/g, '')}@copa2018.local`;
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email, password: 'legacy_password_123', email_confirm: true,
                user_metadata: { nome: userName, nickname: userName }
            });

            if (!authError && authUser.user) {
                await supabase.from('profiles').upsert({
                    id: authUser.user.id, nome: userName, nickname: userName,
                    email, foto_perfil: ''
                });
                profile = { id: authUser.user.id, nickname: userName } as any;
            }
        }

        if (profile) {
            userMap.set(userName, profile.id);
            const selections = WORLD_CUP_2018_DATA.teamSelections[userName as keyof typeof WORLD_CUP_2018_DATA.teamSelections] || [];
            participantsList.push({
                userId: profile.id, displayName: userName, teamSelections: selections
            });
        }
    }

    // Atualizar Settings do Campeonato
    const currentSettings = champ.settings || {};
    await supabase.from('championships').update({
        settings: { ...currentSettings, participants: participantsList }
    }).eq('id', champ.id);

    // 4. Jogos e Palpites
    console.log('⚽ Inserindo Jogos e Palpites...');
    let baseDate = new Date('2018-06-14T15:00:00Z');

    for (let i = 0; i < WORLD_CUP_2018_DATA.matches.length; i++) {
        const mData = WORLD_CUP_2018_DATA.matches[i];
        const matchDate = new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000)); // Uma data fictícia sequencial

        const hId = teamMap.get(mData.home);
        const aId = teamMap.get(mData.away);
        const hName = WORLD_CUP_2018_DATA.teams[mData.home as keyof typeof WORLD_CUP_2018_DATA.teams];
        const aName = WORLD_CUP_2018_DATA.teams[mData.away as keyof typeof WORLD_CUP_2018_DATA.teams];

        if (!hId || !aId) continue;

        const slug = `${mData.home}-vs-${mData.away}-wc2018-${i}`.toLowerCase();
        const { data: match } = await supabase.from('matches').upsert({
            championship_id: champ.id, slug, round: getRoundNumber(mData.round), round_name: mData.round,
            date: matchDate.toISOString(), status: 'finished',
            score_home: mData.score_home, score_away: mData.score_away,
            home_team: hName, away_team: aName, home_team_id: hId, away_team_id: aId,
            home_team_crest: `https://flagcdn.com/w320/${getTeamIso(hName)}.png`,
            away_team_crest: `https://flagcdn.com/w320/${getTeamIso(aName)}.png`
        }, { onConflict: 'slug' }).select('id').single();

        if (match) {
            const predictionsToInsert = Object.entries(mData.predictions).map(([uName, score]) => {
                const uId = userMap.get(uName);
                if (!uId) return null;
                const pts = calculatePoints((score as any)[0], (score as any)[1], mData.score_home, mData.score_away, scoringRules);
                return {
                    match_id: match.id, user_id: uId, home_score: (score as any)[0], away_score: (score as any)[1], points: pts
                };
            }).filter(p => p !== null);

            if (predictionsToInsert.length > 0) {
                await supabase.from('predictions').upsert(predictionsToInsert as any);
            }
        }
    }

    console.log('✅ MIGRAÇÃO COPA 2018 FINALIZADA COM SUCESSO!');
}

importWC2018();
