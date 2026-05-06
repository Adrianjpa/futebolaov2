import { qatar2022RawBets } from "../src/data/legacy/raw_qatar_bets";

const actualResults = [
    // Grupos
    { home: 0, away: 2 }, { home: 6, away: 2 }, { home: 0, away: 2 }, { home: 1, away: 1 },
    { home: 1, away: 2 }, { home: 0, away: 0 }, { home: 0, away: 0 }, { home: 4, away: 1 },
    { home: 0, away: 0 }, { home: 1, away: 2 }, { home: 7, away: 0 }, { home: 1, away: 0 },
    { home: 1, away: 0 }, { home: 0, away: 0 }, { home: 3, away: 2 }, { home: 2, away: 0 },
    { home: 0, away: 2 }, { home: 1, away: 3 }, { home: 1, away: 1 }, { home: 0, away: 0 },
    { home: 0, away: 1 }, { home: 2, away: 0 }, { home: 2, away: 1 }, { home: 2, away: 0 },
    { home: 0, away: 1 }, { home: 0, away: 2 }, { home: 4, away: 1 }, { home: 1, away: 1 },
    { home: 3, away: 3 }, { home: 2, away: 3 }, { home: 1, away: 0 }, { home: 2, away: 0 },
    { home: 1, away: 2 }, { home: 2, away: 0 }, { home: 0, away: 3 }, { home: 0, away: 1 },
    { home: 1, away: 0 }, { home: 1, away: 0 }, { home: 0, away: 2 }, { home: 1, away: 2 },
    { home: 0, away: 0 }, { home: 1, away: 2 }, { home: 2, away: 1 }, { home: 2, away: 4 },
    { home: 0, away: 2 }, { home: 2, away: 1 }, { home: 2, away: 3 }, { home: 1, away: 0 },
    
    // Oitavas (NEDxUSA, ARGxAUS, FRAxPOL, ENGxSEN, JPNxCRO, BRAxKOR, MARxESP, PORxSUI)
    { home: 3, away: 1 }, { home: 2, away: 1 }, { home: 3, away: 1 }, { home: 3, away: 0 },
    { home: 1, away: 1 }, { home: 4, away: 1 }, { home: 0, away: 0 }, { home: 6, away: 1 },
    
    // Quartas (CROxBRA, NEDxARG, MARxPOR, ENGxFRA)
    { home: 1, away: 1 }, { home: 2, away: 2 }, { home: 1, away: 0 }, { home: 1, away: 2 },
    
    // Semi (ARGxCRO, FRAxMAR)
    { home: 3, away: 0 }, { home: 2, away: 0 },
    
    // 3 Lugar (CROxMAR)
    { home: 2, away: 1 },
    
    // Final (ARGxFRA)
    { home: 3, away: 3 }
];

const ranking = qatar2022RawBets.map(user => {
    let points = 0;
    let buchas = 0;
    let acertos = 0; // Just outcomes
    
    user.bets.forEach((bet, i) => {
        const actual = actualResults[i];
        if (!actual) return;
        
        const isBucha = bet.home === actual.home && bet.away === actual.away;
        
        const betDiff = bet.home - bet.away;
        const actualDiff = actual.home - actual.away;
        
        const betOutcome = betDiff > 0 ? 'home' : betDiff < 0 ? 'away' : 'tie';
        const actualOutcome = actualDiff > 0 ? 'home' : actualDiff < 0 ? 'away' : 'tie';
        
        const isOutcome = betOutcome === actualOutcome;
        
        if (isBucha) {
            points += 3;
            buchas += 1;
        } else if (isOutcome) {
            points += 1;
            acertos += 1;
        }
    });
    
    return {
        user: user.user,
        points,
        buchas,
        acertos
    };
});

// Sort by points DESC, then by buchas DESC (tiebreaker)
ranking.sort((a, b) => {
    if (b.points !== a.points) {
        return b.points - a.points;
    }
    return b.buchas - a.buchas;
});

console.log("=== QATAR 2022 RANKING ===");
ranking.forEach((r, i) => {
    console.log(`${i+1}. ${r.user} - ${r.points} pts (Buchas: ${r.buchas})`);
});
