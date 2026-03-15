export interface ScoringRules {
    exactScorePoints: number;
    winnerPoints: number;
    comboEnabled?: boolean;
    comboPoints?: number;
    bonusPoints?: number;
}

export function calculatePoints(
    predHome: number,
    predAway: number,
    realHome: number,
    realAway: number,
    rules: ScoringRules = { exactScorePoints: 3, winnerPoints: 1 },
    isCombo: boolean = false,
    comboTotalGoals?: number | null
): number {
    let points = 0;

    // 1. Setup exact score and situation
    const isExactScore = predHome === realHome && predAway === realAway;
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const realWinner = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';
    const isSituation = predWinner === realWinner;

    // 2. Combo System setup (Total Goals)
    const realTotalGoals = realHome + realAway;
    const betTotalGoals = comboTotalGoals !== undefined && comboTotalGoals !== null ? comboTotalGoals : (predHome + predAway);
    const hitExactGoals = betTotalGoals === realTotalGoals;

    // 3. Calculation
    if (isExactScore) {
        if (isCombo && rules.comboEnabled && rules.comboPoints !== undefined) {
            points = rules.comboPoints; // Full Combo replacement value
        } else {
            points = rules.exactScorePoints; // Traditional Bucha
        }
    } else {
        if (isSituation) {
            points += rules.winnerPoints; // Traditional Winner Situation
        }
        
        if (isCombo && rules.comboEnabled && hitExactGoals && rules.bonusPoints !== undefined) {
            points += rules.bonusPoints; // Goals Bonus 
        }
    }

    return points;
}
