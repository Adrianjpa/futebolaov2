import { supabaseAdmin } from "./supabase-server";
import { Database } from "@/types/database.types";
import { format, addDays } from "date-fns";
import { updateMatchPredictions } from "./prediction-scoring";

type Championship = Database['public']['Tables']['championships']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];

export async function syncMatchesFromExternalApi(force: boolean = false) {
    try {
        console.log("Starting match synchronization service...");

        // 1. Fetch Championships (Only ACTIVE AUTO/HYBRID ones)
        const { data: champs, error: champsError } = await (supabaseAdmin
            .from("championships")
            .select("id, name, settings") as any);

        const championships = (champs || []) as Championship[];
        if (champsError) throw champsError;

        const validChamps = new Set<string>();
        championships.forEach(c => {
            const settings = c.settings as any;
            if (settings?.creationType === 'auto' || settings?.creationType === 'hybrid') {
                validChamps.add(c.id);
            }
        });

        // Calculate Date Window early
        const today = new Date();
        const dateFrom = format(addDays(today, -5), 'yyyy-MM-dd'); // 5 days back
        const dateTo = format(addDays(today, 5), 'yyyy-MM-dd');   // 5 days forward

        if (validChamps.size === 0) {
            return {
                success: true,
                message: "Nenhum campeonato configurado como AUTO ou HYBRID.",
                updates: 0,
                checked: 0,
                apiMatchCount: 0
            };
        }

        // 2. Fetch Candidate Matches (Live, Scheduled or Recently Finished)
        const { data: localMatches, error: matchesError } = await (supabaseAdmin
            .from("matches")
            .select("*")
            .in("championship_id", Array.from(validChamps))
            .in("status", ["live", "scheduled", "finished"])
            .gte("date", dateFrom + "T00:00:00Z") as any);

        const matches = (localMatches || []) as Match[];
        if (matchesError) throw matchesError;

        const matchesWithApiId = matches.filter(m => m.external_id);
        if (matchesWithApiId.length === 0) {
            return {
                success: true,
                message: "Nenhum jogo com ID da API encontrado nos campeonatos ativos.",
                updates: 0,
                checked: 0,
                apiMatchCount: 0
            };
        }

        // 3. Fetch Data from API
        const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
        if (!API_KEY) {
            console.error("FOOTBALL_DATA_API_KEY is missing!");
            return { success: false, error: "Chave da API (FOOTBALL_DATA_API_KEY) não configurada." };
        }


        const url = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

        console.log(`Fetching API: ${url}`);
        const response = await fetch(url, {
            headers: { "X-Auth-Token": API_KEY },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`API Externa retornou erro ${response.status}`);
        }

        const apiData = await response.json();
        const apiMatches = apiData.matches || [];
        const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id?.toString(), m]));

        console.log(`API retornou ${apiMatches.length} jogos.`);

        // 4. Update Database
        let updatesCount = 0;
        const updatedMatchNames: string[] = [];

        for (const localMatch of matchesWithApiId) {
            const apiMatch = apiMatchesMap.get(localMatch.external_id) as any;

            if (apiMatch) {
                let newStatus = 'scheduled';
                const rawStatus = apiMatch.status;
                if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(rawStatus)) newStatus = 'live';
                if (['FINISHED', 'AWARDED'].includes(rawStatus)) newStatus = 'finished';

                // Determine score based on championship settings
                const champ = championships.find(c => c.id === localMatch.championship_id);
                const apiScorePref = (champ?.settings as any)?.apiScoreType || 'fullTime';
                const scoreType = apiScorePref === 'regularTime' ? 'REGULAR (90m)' : 'FULL (90m+ET)';

                let apiHomeScoreRaw = null;
                let apiAwayScoreRaw = null;

                if (apiScorePref === 'regularTime') {
                    // Only 90 minutes
                    apiHomeScoreRaw = apiMatch.score?.regularTime?.home ?? apiMatch.score?.fullTime?.home ?? null;
                    apiAwayScoreRaw = apiMatch.score?.regularTime?.away ?? apiMatch.score?.fullTime?.away ?? null;
                } else {
                    // Full Time (90m + ET). We MUST exclude penalties!
                    // In football-data.org v4, fullTime INCLUDES penalties.
                    // The safest way is to sum regularTime + extraTime goals.
                    if (apiMatch.score?.regularTime?.home !== undefined && apiMatch.score?.regularTime?.home !== null) {
                        apiHomeScoreRaw = apiMatch.score.regularTime.home + (apiMatch.score?.extraTime?.home || 0);
                        apiAwayScoreRaw = apiMatch.score.regularTime.away + (apiMatch.score?.extraTime?.away || 0);
                    } else {
                        // Fallback if regularTime is somehow missing
                        apiHomeScoreRaw = apiMatch.score?.fullTime?.home ?? null;
                        apiAwayScoreRaw = apiMatch.score?.fullTime?.away ?? null;
                    }
                }

                const apiHomeScore = apiHomeScoreRaw ?? 0;
                const apiAwayScore = apiAwayScoreRaw ?? 0;

                // Safety: If API says FINISHED but score is NULL, 
                // keep local status (don't finalize yet) to avoid 0-0 lock.
                if (newStatus === 'finished' && apiHomeScoreRaw === null) {
                    newStatus = localMatch.status;
                }

                const apiDate = apiMatch.utcDate ? new Date(apiMatch.utcDate).toISOString() : localMatch.date;

                const localHomeScore = localMatch.score_home ?? 0;
                const localAwayScore = localMatch.score_away ?? 0;
                const apiTotalGoals = apiHomeScore + apiAwayScore;
                const localTotalGoals = localHomeScore + localAwayScore;

                // Priority Logic (Smart Sync):
                let shouldUpdate = false;

                if (force) {
                    // FORCE OVERRIDE: Admin explicitly requested update.
                    // Update if there is ANY difference in score or status.
                    if (localMatch.status !== newStatus || localHomeScore !== apiHomeScore || localAwayScore !== apiAwayScore) {
                        shouldUpdate = true;
                        console.log(`[Sync-Force] Overwriting ${localMatch.home_team} vs ${localMatch.away_team}`);
                    }
                } else if (newStatus === 'finished' && localMatch.status !== 'finished') {
                    // 1. Transitioning to finished: always update to lock in final API score
                    shouldUpdate = true;
                } else if (localMatch.status === 'finished' && newStatus === 'finished') {
                    // 2. Both finished: only update if local is 0-0 and API has goals (handles finalization lag)
                    if (localHomeScore === 0 && localAwayScore === 0 && (apiHomeScore > 0 || apiAwayScore > 0)) {
                        shouldUpdate = true;
                    }
                } else if (localMatch.status !== 'finished') {
                    // 3. Match in progress or scheduled: update if API has more/different data
                    if (apiTotalGoals > localTotalGoals) {
                        shouldUpdate = true;
                    } else if (apiTotalGoals === localTotalGoals) {
                        shouldUpdate = localMatch.status !== newStatus || localHomeScore !== apiHomeScore || localAwayScore !== apiAwayScore;
                    }
                }
                
                const apiHomeName = apiMatch.homeTeam?.name;
                const apiAwayName = apiMatch.awayTeam?.name;
                const isTeamNameChanged = (apiHomeName && apiHomeName !== localMatch.home_team) || 
                                          (apiAwayName && apiAwayName !== localMatch.away_team);
                
                const isDateChanged = new Date(apiDate).getTime() !== new Date(localMatch.date).getTime();

                if (isTeamNameChanged || isDateChanged) {
                    shouldUpdate = true;
                }

                if (shouldUpdate) {
                    console.log(`[Sync] Updating ${localMatch.home_team}x${localMatch.away_team} (${scoreType}): ${localHomeScore}x${localAwayScore} [${localMatch.status}] -> ${apiHomeScore}x${apiAwayScore} [${newStatus}]`);

                    const { error: updateError } = await (supabaseAdmin
                        .from("matches") as any)
                        .update({
                            score_home: apiHomeScore,
                            score_away: apiAwayScore,
                            status: newStatus,
                            date: apiDate,
                            home_team: apiHomeName || localMatch.home_team,
                            away_team: apiAwayName || localMatch.away_team,
                            home_team_crest: apiMatch.homeTeam?.crest || localMatch.home_team_crest,
                            away_team_crest: apiMatch.awayTeam?.crest || localMatch.away_team_crest
                        })
                        .eq("id", localMatch.id);

                    if (updateError) {
                        console.error(`Error updating match ${localMatch.id}:`, updateError);
                    } else {
                        updatesCount++;
                        updatedMatchNames.push(`${localMatch.home_team} ${apiHomeScore}x${apiAwayScore} ${localMatch.away_team}`);
                        
                        // Recalculate predictions if match is finished or updated
                        // Real-time thrill: calculate even if it's Live or just transitioning to finished
                        if (newStatus === 'finished' || newStatus === 'live') {
                            await updateMatchPredictions(localMatch.id, apiHomeScore, apiAwayScore);
                        }
                    }
                }
            } else {
                // If match not in current API response, maybe it's outside the 1-day range?
            }
        }

        return {
            success: true,
            updates: updatesCount,
            checked: matchesWithApiId.length,
            apiMatchCount: apiMatches.length,
            updatedNames: updatedMatchNames
        };

    } catch (error: any) {
        console.error("Sync Service Error:", error);
        return { success: false, error: error.message };
    }
}
