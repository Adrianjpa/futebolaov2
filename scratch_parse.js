const fs = require('fs');

const raw = `FASE DE GRUPOS
Al Ahly	0	X	0	Inter Miami
B. Munique	10	X	0	Auckland City
PSG	4	X	0	Atl. Madrid
Palmeiras	0	X	0	Porto
Botafogo	2	X	1	S. Sounders
Chelsea	2	X	0	LAFC
Boca Juniors	2	X	2	Benfica
Flamengo	2	X	0	Espérance
Fluminense	0	X	0	B. Dortmund
River Plate	3	X	1	Urawa Red
Ulsan HD	0	X	1	M. Sundowns
Monterrey	1	X	1	Internazionale
M. City	2	X	0	Wydad AC
Real Madrid	1	X	1	Al Hilal
Pachuca	1	X	2	Salzburg
Al Ain	0	X	5	Juventus
Palmeiras	2	X	0	Al Ahly
Inter Miami	2	X	1	Porto
S. Sounders	1	X	3	Atl. Madrid
PSG	0	X	1	Botafogo
Benfica	6	X	0	Auckland City
Flamengo	3	X	1	Chelsea
LAFC	0	X	1	Espérance
B. Munique	2	X	1	Boca Juniors
M. Sundowns	3	X	4	B. Dortmund
Internazionale	2	X	1	Urawa Red
Fluminense	4	X	2	Ulsan HD
River Plate	0	X	0	Monterrey
Juventus	4	X	1	Wydad AC
Real Madrid	3	X	1	Pachuca
Salzburg	0	X	0	Al Hilal
M. City	6	X	0	Al Ain
S. Sounders	0	X	2	PSG
Atl. Madrid	1	X	0	Botafogo
Inter Miami	2	X	2	Palmeiras
Porto	4	X	4	Al Ahly
Benfica	1	X	0	B. Munique
Auckland City	1	X	1	Boca Juniors
LAFC	1	X	1	Flamengo
Espérance	0	X	3	Chelsea
B. Dortmund	1	X	0	Ulsan HD
M. Sundowns	0	X	0	Fluminense
Internazionale	2	X	0	River Plate
Urawa Red	0	X	4	Monterrey
Juventus	2	X	5	M. City
Wydad AC	1	X	2	Al Ain
Al Hilal	2	X	0	Pachuca
Salzburg	0	X	3	Real Madrid
OITAVAS DE FINAL
Palmeiras 	1	X	0	Botafogo
Benfica	1	X	4	Chelsea
PSG	4	X	0	Inter Miami 
Flamengo 	2	X	4	B. Munique
Internazionale 	0	X	2	Fluminense 
M. City	3	X	4	Al Hilal
Real Madrid	1	X	0	Juventus
B. Dortmund 	2	X	1	Monterrey 
QUARTAS DE FINAL
Fluminense 	2	X	1	Al Hilal 
Palmeiras 	1	X	2	Chelsea 
PSG	2	X	0	B. Munique
Real Madrid	3	X	2	B. Dortmund 
SEMIFINAL
Fluminense 	0	X	2	Chelsea 
PSG	4	X	0	Real Madrid
FINAL
Chelsea 	3	X	0	PSG`;

const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
let currentStage = '';
const matches = [];
let id = 1;

for (const line of lines) {
    if (line.includes('FASE DE GRUPOS')) currentStage = 'Fase de Grupos';
    else if (line.includes('OITAVAS DE FINAL')) currentStage = 'Oitavas de Final';
    else if (line.includes('QUARTAS DE FINAL')) currentStage = 'Quartas de Final';
    else if (line.includes('SEMIFINAL')) currentStage = 'Semifinal';
    else if (line.includes('FINAL') && !line.includes('OITAVAS') && !line.includes('QUARTAS')) currentStage = 'Final';
    else {
        // Parse match
        // e.g. Al Ahly	0	X	0	Inter Miami
        // Some might have tabs or spaces. Let's normalize spaces.
        const parts = line.replace(/\t/g, ' ').split(/\s+/);
        // Find the 'X' index
        const xIndex = parts.findIndex(p => p.toUpperCase() === 'X');
        if (xIndex === -1) continue;
        
        const homeScore = parseInt(parts[xIndex - 1], 10);
        const awayScore = parseInt(parts[xIndex + 1], 10);
        const homeTeam = parts.slice(0, xIndex - 1).join(' ').trim();
        const awayTeam = parts.slice(xIndex + 2).join(' ').trim();
        
        matches.push({ id: id++, homeTeam, awayTeam, homeScore, awayScore, stage: currentStage });
    }
}

let tsContent = 'export const supermundial2025Matches = [\n';
let lastStage = '';
for (const m of matches) {
    if (m.stage !== lastStage) {
        tsContent += \`    // \${m.stage}\n\`;
        lastStage = m.stage;
    }
    tsContent += \`    { id: \${m.id}, homeTeam: "\${m.homeTeam}", awayTeam: "\${m.awayTeam}", homeScore: \${m.homeScore}, awayScore: \${m.awayScore}, stage: "\${m.stage}" },\n\`;
}
tsContent += '];\n';

fs.writeFileSync('src/data/legacy/supermundial2025_matches.ts', tsContent);
console.log('Matches written to src/data/legacy/supermundial2025_matches.ts');
