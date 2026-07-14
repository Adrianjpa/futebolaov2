import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase with the service role key to bypass RLS and get the true global ranking
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const championshipId = searchParams.get('championship_id');

        if (!championshipId) {
            return NextResponse.json({ error: 'championship_id is required' }, { status: 400 });
        }

        // 1. Fetch Ranking from view
        const { data: rankingData, error } = await supabase
            .from("ranking_by_championship")
            .select("*")
            .eq("championship_id", championshipId);

        if (error) throw error;

        // 2. Fetch Settings
        const { data: champ } = await supabase
            .from("championships")
            .select("settings")
            .eq("id", championshipId)
            .single();

        const settings = champ?.settings || {};
        const ghostUserId = settings.ghostPlayer || null;
        let rawData = (rankingData || []).filter((r: any) => r.user_id !== ghostUserId);

        // 3. Fetch Participants to inject missing users
        const { data: parts } = await supabase
            .from("championship_participants")
            .select("user_id")
            .eq("championship_id", championshipId);

        if (parts && parts.length > 0) {
            const { data: publicProfiles } = await supabase.from("public_profiles").select("id, nome, nickname, foto_perfil");
            const profilesMap = new Map((publicProfiles || []).map((p: any) => [p.id, p]));
            
            const existingUserIds = new Set(rawData.map((r: any) => r.user_id));

            parts.forEach((p: any) => {
                if (ghostUserId && p.user_id === ghostUserId) return;

                if (!existingUserIds.has(p.user_id)) {
                    const prof = profilesMap.get(p.user_id) as any;
                    if (prof) {
                        rawData.push({
                            user_id: p.user_id,
                            nome: prof.nome,
                            nickname: prof.nickname,
                            foto_perfil: prof.foto_perfil,
                            total_points: 0,
                            exact_scores: 0,
                            outcomes: 0,
                            errors: 0
                        });
                        existingUserIds.add(p.user_id);
                    }
                }
            });
        }

        // Explicitly Inject Loia if enabled and missing
        if (settings.enableLoia) {
            const legacyParts = settings.participants || [];
            const loiaParticipant = legacyParts.find((p: any) => p.email === "lindoaldo@legacy.local");
            const loiaId = loiaParticipant?.userId || loiaParticipant?.id || loiaParticipant?.user_id;
            
            if (loiaId && !rawData.some((r: any) => r.user_id === loiaId)) {
                rawData.push({
                    user_id: loiaId,
                    nome: loiaParticipant.displayName || loiaParticipant.name || "Lindoaldo",
                    nickname: "Lóia",
                    foto_perfil: loiaParticipant.photoUrl || "",
                    total_points: 0,
                    exact_scores: 0,
                    outcomes: 0,
                    errors: 0
                });
            }
        }

        // 4. Compute real points for injected users
        const injectedUserIds = rawData.filter((r: any) => !rankingData?.some((o: any) => o.user_id === r.user_id)).map((r: any) => r.user_id);
        
        if (injectedUserIds.length > 0) {
            const { data: missingPreds } = await supabase
                .from("predictions")
                .select("user_id, points, home_score, away_score, is_combo, combo_total_goals, matches!inner(championship_id, score_home, score_away)")
                .eq("matches.championship_id", championshipId)
                .in("user_id", injectedUserIds);
                
            if (missingPreds && missingPreds.length > 0) {
                rawData.forEach((user: any) => {
                    if (injectedUserIds.includes(user.user_id)) {
                        const userPreds = missingPreds.filter((p: any) => p.user_id === user.user_id);
                        let pontos = 0;
                        let buchas = 0;
                        let situacao = 0;
                        let erros = 0;

                        userPreds.forEach((p: any) => {
                            pontos += (p.points || 0);
                            const match = p.matches;
                            if (match && match.score_home !== null && match.score_away !== null) {
                                const ph = p.home_score;
                                const pa = p.away_score;
                                const mh = match.score_home;
                                const ma = match.score_away;

                                const winP = ph > pa ? 1 : (ph < pa ? 2 : 0);
                                const winM = mh > ma ? 1 : (mh < ma ? 2 : 0);

                                const isExact = ph === mh && pa === ma;
                                const hitGoals = p.is_combo && p.combo_total_goals === (mh + ma);

                                if (isExact) {
                                    buchas++;
                                } else {
                                    if (winP === winM) situacao++;
                                    if (winP !== winM && !hitGoals) erros++;
                                }
                            }
                        });
                        
                        user.total_points = pontos;
                        user.exact_scores = buchas;
                        user.outcomes = situacao;
                        user.errors = erros;
                    }
                });
            }
        }

        // 5. First Bucha Calculation
        const exactPoints = settings.exactScorePoints || 3;
        const { data: allBuchas } = await supabase
            .from("predictions")
            .select("user_id, matches!inner(date)")
            .eq("matches.championship_id", championshipId)
            .gte("points", exactPoints);
            
        const firstBuchaMap = new Map();
        if (allBuchas) {
            allBuchas.forEach((b: any) => {
                const time = new Date(b.matches.date).getTime();
                const current = firstBuchaMap.get(b.user_id) || Infinity;
                if (time < current) firstBuchaMap.set(b.user_id, time);
            });
        }

        const tiebreakers = settings.tiebreakerCriteria || ['pontos', 'buchas', 'situacoes', 'erros', 'highlander'];

        rawData.sort((a: any, b: any) => {
            for (const criteria of tiebreakers) {
                if (criteria === 'pontos') {
                    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
                } else if (criteria === 'buchas') {
                    if (b.exact_scores !== a.exact_scores) return (b.exact_scores || 0) - (a.exact_scores || 0);
                } else if (criteria === 'situacoes') {
                    if (b.outcomes !== a.outcomes) return (b.outcomes || 0) - (a.outcomes || 0);
                } else if (criteria === 'erros') {
                    if (b.errors !== a.errors) return (a.errors || 0) - (b.errors || 0);
                } else if (criteria === 'primeira_bucha') {
                    const timeA = firstBuchaMap.get(a.user_id) || Infinity;
                    const timeB = firstBuchaMap.get(b.user_id) || Infinity;
                    if (timeA !== timeB) return timeA - timeB;
                }
            }
            const nameA = a.nickname || a.nome || "";
            const nameB = b.nickname || b.nome || "";
            return nameA.localeCompare(nameB);
        });

        // The leader is the first element
        const leader = rawData.length > 0 ? rawData[0] : null;

        return NextResponse.json({ success: true, leader });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
