import { createClient } from '@supabase/supabase-js';
import { COPA_AMERICA_2019_DATA } from '../src/data/legacy/copa2019_data';
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
        'Brasil': 'br', 'Bolívia': 'bo', 'Venezuela': 've', 'Peru': 'pe',
        'Argentina': 'ar', 'Colômbia': 'co', 'Paraguai': 'py', 'Catar': 'qa',
        'Uruguai': 'uy', 'Equador': 'ec', 'Japão': 'jp', 'Chile': 'cl'
    };
    return map[name] || 'xx';
}

function getRoundNumber(phase: string): number {
    const map: Record<string, number> = {
        'Fase de Grupos': 1,
        'Quartas de Final': 2,
        'Semifinal': 3,
        '3º Lugar': 4,
        'Final': 5
    };
    return map[phase] || 1;
}

async function importCopa2019() {
    console.log('🚀 Iniciando Migração Copa América 2019...');

    // 1. Criar ou Localizar Campeonato
    let { data: champ } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', `%${COPA_AMERICA_2019_DATA.championshipName}%`)
        .maybeSingle();

    if (!champ) {
        console.log('🏆 Criando campeonato "Copa América 2019"...');
        const { data: newChamp, error } = await supabase.from('championships').insert({
            name: COPA_AMERICA_2019_DATA.championshipName,
            status: 'finalizado',
            legacy_import: true,
            settings: {
                exactScorePoints: 3,
                winnerPoints: 1,
                enableSelectionPriority: true,
                banner: { title: "Copa América 2019", subTitle: "Legacy" }
            }
        }).select().single();

        if (error) {
            console.error('Erro ao criar campeonato:', error);
            return;
        }
        champ = newChamp;
    }

    const scoringRules = {
        exactScorePoints: champ.settings?.exactScorePoints || 3,
        winnerPoints: champ.settings?.winnerPoints || 1
    };
    console.log(`📏 Usando Regras: Bucha=${scoringRules.exactScorePoints}, Situação=${scoringRules.winnerPoints}`);

    // Limpeza (Lembrando que é uma migração limpa)
    console.log('🧹 Limpando dados antigos...');
    await supabase.from('matches').delete().eq('championship_id', champ.id);
    await supabase.from('championship_participants').delete().eq('championship_id', champ.id);

    // 2. Times
    console.log('🏟️ Sincronizando Times...');
    const teamMap = new Map<string, string>();
    for (const [sigla, nome] of Object.entries(COPA_AMERICA_2019_DATA.teams)) {
        const iso = getTeamIso(nome);
        const { data: team } = await supabase.from('teams').upsert({
            name: nome, short_name: sigla, crest_url: `https://flagcdn.com/w320/${iso}.png`
        }, { onConflict: 'name' }).select('id').single();
        if (team) teamMap.set(nome, team.id);
    }

    // 3. Usuários (Legados -> Auth)
    console.log('👥 Sincronizando e Buscando Usuários...');
    const userIdMap = new Map<string, string>();
    const participantsList: any[] = [];

    for (const u of COPA_AMERICA_2019_DATA.users) {
        let { data: profile } = await supabase.from('profiles').select('*').eq('email', u.email).maybeSingle();

        if (!profile) {
            console.log(`👻 Criando novo usuário fantasma (Legacy): ${u.name} (${u.email})`);
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email: u.email, password: 'legacy_password_123', email_confirm: true,
                user_metadata: { nome: u.name, nickname: u.name }
            });

            if (!authError && authUser.user) {
                await supabase.from('profiles').upsert({
                    id: authUser.user.id, nome: u.name, nickname: u.name,
                    email: u.email, foto_perfil: ''
                });
                profile = { id: authUser.user.id, nickname: u.name, email: u.email } as any;
            } else {
                console.error("Erro ao criar user auth", authError);
            }
        } else {
            console.log(`✅ Usuário ${u.name} encontrado! ID: ${profile.id}`);
        }

        if (profile) {
            userIdMap.set(u.name, profile.id);
            const selections = COPA_AMERICA_2019_DATA.teamSelections[u.name as keyof typeof COPA_AMERICA_2019_DATA.teamSelections] || [];
            
            participantsList.push({
                userId: profile.id, displayName: u.name, teamSelections: selections
            });

            // Insere também na tabela championship_participants
            await supabase.from('championship_participants').upsert({
                championship_id: champ.id,
                user_id: profile.id,
                team_selections: selections,
                nickname: u.name
            }, { onConflict: 'championship_id,user_id' });
        }
    }

    // Atualizar Settings do Campeonato (compatibilidade com histórico legado)
    const currentSettings = champ.settings || {};
    await supabase.from('championships').update({
        settings: { ...currentSettings, participants: participantsList, enableSelectionTiebreaker: true, enableSelectionPriority: true, tiebreakerCriteria: ['pontos', 'buchas', 'situacoes', 'erros', 'highlander'] }
    }).eq('id', champ.id);

    // 4. Jogos e Palpites
    console.log('⚽ Inserindo Jogos e Palpites...');
    let baseDate = new Date('2019-06-14T15:00:00Z');

    for (let i = 0; i < COPA_AMERICA_2019_DATA.matches.length; i++) {
        const mData = COPA_AMERICA_2019_DATA.matches[i];
        const matchDate = new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000)); // Data sequencial fictícia para ordenar certo

        const hName = COPA_AMERICA_2019_DATA.teams[mData.home as keyof typeof COPA_AMERICA_2019_DATA.teams];
        const aName = COPA_AMERICA_2019_DATA.teams[mData.away as keyof typeof COPA_AMERICA_2019_DATA.teams];
        const hId = teamMap.get(hName);
        const aId = teamMap.get(aName);

        if (!hId || !aId) {
            console.error(`Erro ao achar times: ${hName} ou ${aName}`);
            continue;
        }

        const slug = `${mData.home}-vs-${mData.away}-copa2019-${i}`.toLowerCase();
        const { data: match, error: matchError } = await supabase.from('matches').upsert({
            championship_id: champ.id, slug, round: getRoundNumber(mData.round), round_name: mData.round,
            date: matchDate.toISOString(), status: 'finished',
            score_home: mData.score_home, score_away: mData.score_away,
            home_team: hName, away_team: aName, home_team_id: hId, away_team_id: aId,
            home_team_crest: `https://flagcdn.com/w320/${getTeamIso(hName)}.png`,
            away_team_crest: `https://flagcdn.com/w320/${getTeamIso(aName)}.png`
        }, { onConflict: 'slug' }).select('id').single();

        if (match) {
            const predictionsToInsert = Object.entries(mData.predictions).map(([uName, score]) => {
                const uId = userIdMap.get(uName);
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

    console.log('✅ MIGRAÇÃO COPA AMÉRICA 2019 FINALIZADA COM SUCESSO!');
}

importCopa2019();
