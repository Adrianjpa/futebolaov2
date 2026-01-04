
import { EURO_2012_DATA } from './src/data/legacy/euro2012_data';
import { calculatePoints } from './src/lib/scoring';

const scoringRules = { exactScorePoints: 3, winnerPoints: 1 };

const userPoints: Record<string, number> = {};
EURO_2012_DATA.users.forEach(u => userPoints[u] = 0);

EURO_2012_DATA.matches.forEach(m => {
    Object.entries(m.predictions).forEach(([u, pred]) => {
        if (userPoints[u] !== undefined) {
            userPoints[u] += calculatePoints(pred[0], pred[1], m.score_home, m.score_away, scoringRules);
        }
    });
});

console.log('--- Match Points Only ---');
console.log(JSON.stringify(userPoints, null, 2));

// Official Ranking Bonus (example from Euro 2012)
// Champion: 5 points?
// 2nd: 3 points?
// Correct Team in Top 5: 1 point?
// Let's check what the user wants. The user says Adriano = 26.
// Match points for Adriano above.
