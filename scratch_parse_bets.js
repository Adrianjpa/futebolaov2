const fs = require('fs');

const rawText = `Tony tony@copa2022.local

Grupos
1	X	2
3	X	0
2	X	1
1	X	1
2	X	2
3	X	1
1	X	2
2	X	2
1	X	3
2	X	1
1	X	2
1	X	3
2	X	0
2	X	1
2	X	1
0	X	2
2	X	1
3	X	2
1	X	2
4	X	2
2	X	0
1	X	2
2	X	1
3	X	0
1	X	2
2	X	0
2	X	1
2	X	1
2	X	0
3	X	1
1	X	2
2	X	0
1	X	4
1	X	1
2	X	3
3	X	1
1	X	3
0	X	2
1	X	1
1	X	3
2	X	1
1	X	2
2	X	1
1	X	2
2	X	3
0	X	2
2	X	1
1	X	2
	oitavas
1	X	2
2	X	1
4	X	1
2	X	3
1	X	2
4	X	1
3	X	2
3	X	1
	Quartas
2	X	1
3	X	2
3	X	2
3	X	1
	Semi
2	X	1
3	X	2
	Final
2	X	4
EQUIPES		
PSG		
Real Madrid		
B. Munique`;

const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
let currentParticipant = '';
let currentEmail = '';
const bets = [];
let teams = [];
let parsingTeams = false;

for (const line of lines) {
    if (line.includes('@')) {
        const parts = line.split(/\s+/);
        currentEmail = parts.pop();
        currentParticipant = parts.join(' ');
    } else if (line.toUpperCase().includes('EQUIPES')) {
        parsingTeams = true;
    } else if (parsingTeams) {
        teams.push(line);
    } else if (line.includes('X')) {
        const parts = line.replace(/\t/g, ' ').split(/\s+/);
        const xIndex = parts.findIndex(p => p.toUpperCase() === 'X');
        if (xIndex !== -1) {
            bets.push({
                homeScore: parseInt(parts[xIndex - 1], 10),
                awayScore: parseInt(parts[xIndex + 1], 10)
            });
        }
    }
}

const newBetObj = {
    participant: currentParticipant,
    email: currentEmail,
    teams: teams,
    bets: bets
};

const filePath = 'src/data/legacy/supermundial2025_bets.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\];\s*$/, '');
content += ',\n    ' + JSON.stringify(newBetObj, null, 4).replace(/\\n/g, '') + '\n];\n';

fs.writeFileSync(filePath, content);
console.log('Added Tony to src/data/legacy/supermundial2025_bets.ts');
console.log('Bets count:', bets.length);
