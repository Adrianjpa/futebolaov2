
import { createClient } from '@supabase/supabase-js';
import { EURO_2012_DATA } from '../src/data/legacy/euro2012_data';
import { calculatePoints } from '../src/lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getRoundNumber(phase: string): number {
    const map: Record<string, number> = {
        'Fase de Grupos': 1,
        'Quartas de Final': 2,
        'Semifinal': 3,
        'Final': 4
    };
    return map[phase] || 1;
}

function getTeamIso(name: string): string {
    const map: Record<string, string> = {
        'Polônia': 'pl', 'Grécia': 'gr', 'Rússia': 'ru', 'República Tcheca': 'cz',
        'Holanda': 'nl', 'Dinamarca': 'dk', 'Alemanha': 'de', 'Portugal': 'pt',
        'Espanha': 'es', 'Itália': 'it', 'Irlanda': 'ie', 'Croácia': 'hr',
        'França': 'fr', 'Inglaterra': 'gb-eng', 'Ucrânia': 'ua', 'Suécia': 'se'
    };
    return map[name] || 'xx';
}

async function importEuro2012() {
    console.log('🚀 Iniciando Importação (Com Criação de Usuários Auth)...');

    // 1. Campeonato
    const { data: champ } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', `%${EURO_2012_DATA.championshipName}%`)
        .single();

    if (!champ) {
        console.error('❌ Campeonato não encontrado.');
        return;
    }

    // Limpeza
    console.log('🧹 Limpando jogos antigos...');
    await supabase.from('matches').delete().eq('championship_id', champ.id);

    const scoringRules = {
        exactScorePoints: champ.settings?.exactScorePoints || 3,
        winnerPoints: champ.settings?.winnerPoints || 1
    };

    // 2. Times
    const teamMap = new Map<string, string>();
    for (const [sigla, nome] of Object.entries(EURO_2012_DATA.teams)) {
        const iso = getTeamIso(nome);
        const { data: team } = await supabase.from('teams').upsert({
            name: nome, short_name: sigla, crest_url: `https://flagcdn.com/w320/${iso}.png`
        }, { onConflict: 'name' }).select('id').single();
        if (team) teamMap.set(sigla, team.id);
    }

    // 3. Usuários (AUTH + PROFILES)
    const userMap = new Map<string, string>();
    const newParticipantsList: any[] = [];

    for (const userName of EURO_2012_DATA.users) {
        // Busca Profile Pelo Nickname
        let { data: user } = await supabase.from('profiles').select('*').eq('nickname', userName).maybeSingle();

        if (!user) {
            console.log(`👻 Criando Fantasma no Auth: ${userName}`);
            const email = `${userName.toLowerCase().replace(/\s+/g, '')}@legacy.local`;
            const password = 'legacy_password_123';

            // Tenta criar no Auth
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { nome: userName, nickname: userName }
            });

            if (authError) {
                // Se deu erro, pode ser que já exista no Auth (ex: script rodou pela metade)
                // Tenta buscar o user pelo email no Auth Admin list (se tivesse permissão de listar)
                // Como não temos listUsers fácil aqui, vamos assumir erro real
                console.error(`❌ Erro Autenticação ${userName}:`, authError.message);
                continue;
            }

            if (authUser && authUser.user) {
                const fakeId = authUser.user.id;

                // Garante insert no Profiles
                const { error: upsertErr } = await supabase.from('profiles').upsert({
                    id: fakeId,
                    nome: userName,
                    nickname: userName,
                    email: email,
                    foto_perfil: ''
                });

                if (upsertErr) console.error(`❌ Erro Upsert Profile ${userName}:`, upsertErr.message);

                user = { id: fakeId, nickname: userName, nome: userName, email: email, foto_perfil: '' };
            }
        } else {
            console.log(`👤 Usuário já existe: ${userName}`);
        }

        if (user) {
            userMap.set(userName, user.id);
            const selections = EURO_2012_DATA.teamSelections[userName as keyof typeof EURO_2012_DATA.teamSelections] || [];
            newParticipantsList.push({
                userId: user.id,
                displayName: user.nickname || user.nome,
                photoUrl: user.foto_perfil || '',
                email: user.email || '',
                teamSelections: selections
            });
        }
    }

    // 3.1 Atualizar Participants
    const currentSettings = champ.settings || {};
    let finalParticipants = Array.isArray(currentSettings.participants) ? [...currentSettings.participants] : [];

    for (const newP of newParticipantsList) {
        if (!finalParticipants.some((p: any) => p.userId === newP.userId)) {
            finalParticipants.push(newP);
        }
    }

    await supabase.from('championships').update({
        settings: { ...currentSettings, participants: finalParticipants }
    }).eq('id', champ.id);
    console.log('✅ Lista de Participantes Atualizada!');


    // 4. Jogos
    let baseDate = new Date('2012-06-08T13:00:00Z');

    for (let i = 0; i < EURO_2012_DATA.matches.length; i++) {
        const matchData = EURO_2012_DATA.matches[i];
        const matchDate = new Date(baseDate.getTime() + (i * 3 * 60 * 60 * 1000));

        const hId = teamMap.get(matchData.home);
        const aId = teamMap.get(matchData.away);
        const hName = (EURO_2012_DATA.teams as any)[matchData.home];
        const aName = (EURO_2012_DATA.teams as any)[matchData.away];

        if (!hId || !aId) continue;

        const slug = `${matchData.home}-vs-${matchData.away}-euro2012-r${getRoundNumber(matchData.round)}`.toLowerCase();

        const { data: match, error: matchError } = await supabase
            .from('matches')
            .upsert({
                championship_id: champ.id,
                slug: slug,
                round: getRoundNumber(matchData.round),
                round_name: matchData.round,
                date: matchDate.toISOString(),
                status: 'finished',
                score_home: matchData.score_home,
                score_away: matchData.score_away,
                home_team: hName, away_team: aName,
                home_team_id: hId, away_team_id: aId,
                home_team_crest: `https://flagcdn.com/w320/${getTeamIso(hName)}.png`,
                away_team_crest: `https://flagcdn.com/w320/${getTeamIso(aName)}.png`
            }, { onConflict: 'slug' })
            .select('id')
            .single();

        if (matchError && !matchError.message.includes('round_name')) {
            console.error(`❌ Erro Jogo ${slug}:`, matchError.message);
        }

        if (match) {
            for (const [uName, score] of Object.entries(matchData.predictions as any)) {
                const uId = userMap.get(uName);
                if (!uId) continue;
                const pts = calculatePoints((score as any)[0], (score as any)[1], matchData.score_home, matchData.score_away, scoringRules);

                await supabase.from('predictions').upsert({
                    match_id: match.id, user_id: uId, home_score: (score as any)[0], away_score: (score as any)[1], points: pts
                }, { onConflict: 'match_id,user_id' });
            }
        }
    }
    console.log('✅ IMPORTAÇÃO FINALIZADA!');
}

importEuro2012();
