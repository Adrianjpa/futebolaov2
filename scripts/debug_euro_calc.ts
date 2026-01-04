
const TEAM_MAP: Record<string, string> = {
    "POL": "Polônia", "GRE": "Grécia", "RUS": "Rússia", "THE": "República Tcheca",
    "HOL": "Holanda", "DIN": "Dinamarca", "ALE": "Alemanha", "POR": "Portugal",
    "ESP": "Espanha", "ITA": "Itália", "IRL": "Irlanda", "CRO": "Croácia",
    "FRA": "França", "ING": "Inglaterra", "UCR": "Ucrânia", "SUE": "Suécia"
};

const REAL_SCORES_RAW = [
    { h: "POL", a: "GRE", sh: 1, sa: 1 },
    { h: "RUS", a: "THE", sh: 4, sa: 1 },
    { h: "HOL", a: "DIN", sh: 0, sa: 1 },
    { h: "ALE", a: "POR", sh: 1, sa: 0 },
    { h: "ESP", a: "ITA", sh: 1, sa: 1 },
    { h: "IRL", a: "CRO", sh: 1, sa: 3 },
    { h: "FRA", a: "ING", sh: 1, sa: 1 },
    { h: "UCR", a: "SUE", sh: 2, sa: 1 },
    { h: "GRE", a: "THE", sh: 1, sa: 2 },
    { h: "POL", a: "RUS", sh: 1, sa: 1 },
    { h: "DIN", a: "POR", sh: 2, sa: 3 },
    { h: "HOL", a: "ALE", sh: 1, sa: 2 },
    { h: "ITA", a: "CRO", sh: 1, sa: 1 },
    { h: "ESP", a: "IRL", sh: 4, sa: 0 },
    { h: "UCR", a: "FRA", sh: 0, sa: 2 },
    { h: "SUE", a: "ING", sh: 2, sa: 3 },
    { h: "GRE", a: "RUS", sh: 1, sa: 0 },
    { h: "THE", a: "POL", sh: 1, sa: 0 },
    { h: "POR", a: "HOL", sh: 2, sa: 1 },
    { h: "DIN", a: "ALE", sh: 1, sa: 2 },
    { h: "CRO", a: "ESP", sh: 0, sa: 1 },
    { h: "ITA", a: "IRL", sh: 2, sa: 0 },
    { h: "SUE", a: "FRA", sh: 2, sa: 0 },
    { h: "ING", a: "UCR", sh: 1, sa: 0 },
    // Quartas (Indices 24-27)
    { h: "THE", a: "POR", sh: 0, sa: 1 },
    { h: "ALE", a: "GRE", sh: 4, sa: 2 },
    { h: "ESP", a: "FRA", sh: 2, sa: 0 },
    { h: "ING", a: "ITA", sh: 0, sa: 0 },
    // Semis (Indices 28-29)
    { h: "POR", a: "ESP", sh: 0, sa: 0 },
    { h: "ALE", a: "ITA", sh: 1, sa: 2 },
    // Final (Index 30)
    { h: "ESP", a: "ITA", sh: 4, sa: 0 }
];

const PREDS = {
    "Jullius": [
        "1-1", "2-1", "2-0", "2-1", "0-0", "0-0", "0-1", "1-0", "1-1", "2-2",
        "1-3", "1-1", "1-0", "2-0", "1-2", "0-2", "0-1", "1-1", "1-1", "0-2",
        "1-2", "2-0", "0-2", "2-1", "1-1", "1-0", "1-0", "1-1", "1-0", "1-2", "2-0"
    ],
    "Elisson": [
        "1-1", "2-1", "1-0", "2-1", "0-0", "1-2", "0-0", "1-2", "0-0", "1-1",
        "0-1", "0-1", "1-0", "3-0", "1-2", "0-1", "1-2", "1-1", "2-2", "1-3",
        "1-2", "1-0", "1-2", "2-0", "0-2", "2-0", "1-0", "0-1", "0-2", "2-0", "0-1"
    ]
};

function calculatePoints(pHome: number, pAway: number, rHome: number, rAway: number) {
    if (pHome === rHome && pAway === rAway) return 3;
    const pW = pHome > pAway ? 'h' : pHome < pAway ? 'a' : 'd';
    const rW = rHome > rAway ? 'h' : rHome < rAway ? 'a' : 'd';
    if (pW === rW) return 1;
    return 0;
}

console.log("Analyzing Jullius and Elisson...");

for (const user of ["Jullius", "Elisson"]) {
    console.log(`\n--- ${user} ---`);
    let total = 0;
    let exacts = 0;
    const preds = (PREDS as any)[user];

    preds.forEach((p: string, i: number) => {
        const [ph, pa] = p.split("-").map(Number);
        const match = REAL_SCORES_RAW[i];
        const pts = calculatePoints(ph, pa, match.sh, match.sa);
        total += pts;
        if (pts === 3) exacts++;

        console.log(`[${i + 1}] ${match.h} ${match.sh}-${match.sa} ${match.a} | Pred: ${ph}-${pa} | Pts: ${pts}`);
    });
    console.log(`TOTAL: ${total} | Exacts: ${exacts}`);
}
