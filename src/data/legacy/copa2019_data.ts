export const COPA_AMERICA_2019_DATA = {
    championshipName: "Copa América 2019",
    teams: {
        'BR': 'Brasil', 'BO': 'Bolívia', 'VE': 'Venezuela', 'PE': 'Peru',
        'AR': 'Argentina', 'CO': 'Colômbia', 'PY': 'Paraguai', 'QA': 'Catar',
        'UY': 'Uruguai', 'EC': 'Equador', 'JP': 'Japão', 'CL': 'Chile'
    },
    users: [
        { name: 'MARCELO', email: 'marcelo@copa2018.local' },
        { name: 'FERNANDO', email: 'fernando@copa2018.local' },
        { name: 'DANIEL', email: 'daniel@legacy.local' },
        { name: 'ALAN', email: 'alan@legacy.local' },
        { name: 'RICARDO', email: 'ricardo@copa2018.local' },
        { name: 'LINDOALDO', email: 'lindoaldo@legacy.local' },
        { name: 'CLODOALDO', email: 'clodoaldo@legacy.local' }
    ],
    teamSelections: {
        'MARCELO': ['Brasil', 'Chile', 'Uruguai', 'Peru'],
        'FERNANDO': ['Brasil', 'Argentina', 'Chile', 'Uruguai'],
        'DANIEL': ['Brasil', 'Colômbia', 'Uruguai', 'Chile'],
        'ALAN': ['Uruguai', 'Colômbia', 'Chile', 'Paraguai'],
        'RICARDO': ['Uruguai', 'Argentina', 'Brasil', 'Japão'],
        'LINDOALDO': ['Brasil', 'Uruguai', 'Argentina', 'Colômbia'],
        'CLODOALDO': ['Brasil', 'Argentina', 'Uruguai', 'Colômbia']
    },
    matches: [
        // Fase de Grupos
        {
            round: 'Fase de Grupos', home: 'BR', away: 'BO', score_home: 3, score_away: 0,
            predictions: { 'MARCELO': [3,0], 'FERNANDO': [2,0], 'DANIEL': [3,0], 'ALAN': [2,0], 'RICARDO': [3,0], 'LINDOALDO': [3,1], 'CLODOALDO': [2,1] }
        },
        {
            round: 'Fase de Grupos', home: 'VE', away: 'PE', score_home: 0, score_away: 0,
            predictions: { 'MARCELO': [0,2], 'FERNANDO': [0,1], 'DANIEL': [2,1], 'ALAN': [1,2], 'RICARDO': [1,2], 'LINDOALDO': [1,2], 'CLODOALDO': [0,1] }
        },
        {
            round: 'Fase de Grupos', home: 'AR', away: 'CO', score_home: 0, score_away: 2,
            predictions: { 'MARCELO': [2,0], 'FERNANDO': [1,1], 'DANIEL': [1,2], 'ALAN': [1,1], 'RICARDO': [1,1], 'LINDOALDO': [2,1], 'CLODOALDO': [1,0] }
        },
        {
            round: 'Fase de Grupos', home: 'PY', away: 'QA', score_home: 2, score_away: 2,
            predictions: { 'MARCELO': [2,0], 'FERNANDO': [4,0], 'DANIEL': [1,0], 'ALAN': [2,0], 'RICARDO': [2,0], 'LINDOALDO': [2,1], 'CLODOALDO': [2,0] }
        },
        {
            round: 'Fase de Grupos', home: 'UY', away: 'EC', score_home: 4, score_away: 0,
            predictions: { 'MARCELO': [3,0], 'FERNANDO': [2,0], 'DANIEL': [1,0], 'ALAN': [1,0], 'RICARDO': [2,1], 'LINDOALDO': [2,0], 'CLODOALDO': [2,1] }
        },
        {
            round: 'Fase de Grupos', home: 'JP', away: 'CL', score_home: 0, score_away: 4,
            predictions: { 'MARCELO': [1,2], 'FERNANDO': [1,2], 'DANIEL': [0,2], 'ALAN': [0,1], 'RICARDO': [2,2], 'LINDOALDO': [1,2], 'CLODOALDO': [0,2] }
        },
        {
            round: 'Fase de Grupos', home: 'BO', away: 'PE', score_home: 1, score_away: 3,
            predictions: { 'MARCELO': [1,2], 'FERNANDO': [1,3], 'DANIEL': [0,1], 'ALAN': [1,1], 'RICARDO': [1,3], 'LINDOALDO': [1,2], 'CLODOALDO': [0,2] }
        },
        {
            round: 'Fase de Grupos', home: 'BR', away: 'VE', score_home: 0, score_away: 0,
            predictions: { 'MARCELO': [2,0], 'FERNANDO': [3,0], 'DANIEL': [3,1], 'ALAN': [2,0], 'RICARDO': [5,0], 'LINDOALDO': [2,0], 'CLODOALDO': [2,0] }
        },
        {
            round: 'Fase de Grupos', home: 'CO', away: 'QA', score_home: 1, score_away: 0,
            predictions: { 'MARCELO': [2,1], 'FERNANDO': [2,0], 'DANIEL': [2,0], 'ALAN': [2,0], 'RICARDO': [1,0], 'LINDOALDO': [2,1], 'CLODOALDO': [2,0] }
        },
        {
            round: 'Fase de Grupos', home: 'AR', away: 'PY', score_home: 1, score_away: 1,
            predictions: { 'MARCELO': [2,1], 'FERNANDO': [1,1], 'DANIEL': [2,1], 'ALAN': [2,1], 'RICARDO': [2,0], 'LINDOALDO': [2,0], 'CLODOALDO': [2,1] }
        },
        {
            round: 'Fase de Grupos', home: 'UY', away: 'JP', score_home: 2, score_away: 2,
            predictions: { 'MARCELO': [2,1], 'FERNANDO': [1,1], 'DANIEL': [2,0], 'ALAN': [2,0], 'RICARDO': [2,1], 'LINDOALDO': [2,1], 'CLODOALDO': [2,0] }
        },
        {
            round: 'Fase de Grupos', home: 'EC', away: 'CL', score_home: 1, score_away: 2,
            predictions: { 'MARCELO': [1,3], 'FERNANDO': [0,2], 'DANIEL': [1,2], 'ALAN': [1,0], 'RICARDO': [1,0], 'LINDOALDO': [0,2], 'CLODOALDO': [1,2] }
        },
        {
            round: 'Fase de Grupos', home: 'BO', away: 'VE', score_home: 1, score_away: 3,
            predictions: { 'MARCELO': [1,1], 'FERNANDO': [1,1], 'DANIEL': [1,2], 'ALAN': [0,2], 'RICARDO': [2,0], 'LINDOALDO': [1,2], 'CLODOALDO': [1,2] }
        },
        {
            round: 'Fase de Grupos', home: 'PE', away: 'BR', score_home: 0, score_away: 5,
            predictions: { 'MARCELO': [1,2], 'FERNANDO': [0,2], 'DANIEL': [0,2], 'ALAN': [1,2], 'RICARDO': [1,3], 'LINDOALDO': [1,2], 'CLODOALDO': [1,2] }
        },
        {
            round: 'Fase de Grupos', home: 'QA', away: 'AR', score_home: 0, score_away: 2,
            predictions: { 'MARCELO': [0,3], 'FERNANDO': [0,3], 'DANIEL': [0,3], 'ALAN': [0,4], 'RICARDO': [0,4], 'LINDOALDO': [1,3], 'CLODOALDO': [0,2] }
        },
        {
            round: 'Fase de Grupos', home: 'CO', away: 'PY', score_home: 1, score_away: 0,
            predictions: { 'MARCELO': [2,2], 'FERNANDO': [1,1], 'DANIEL': [2,0], 'ALAN': [0,0], 'RICARDO': [2,1], 'LINDOALDO': [2,0], 'CLODOALDO': [2,1] }
        },
        {
            round: 'Fase de Grupos', home: 'CL', away: 'UY', score_home: 0, score_away: 1,
            predictions: { 'MARCELO': [1,1], 'FERNANDO': [2,2], 'DANIEL': [0,1], 'ALAN': [1,2], 'RICARDO': [1,3], 'LINDOALDO': [1,2], 'CLODOALDO': [1,2] }
        },
        {
            round: 'Fase de Grupos', home: 'EC', away: 'JP', score_home: 1, score_away: 1,
            predictions: { 'MARCELO': [0,1], 'FERNANDO': [0,1], 'DANIEL': [1,1], 'ALAN': [1,0], 'RICARDO': [1,2], 'LINDOALDO': [1,2], 'CLODOALDO': [1,2] }
        },

        // Quartas de Final
        {
            round: 'Quartas de Final', home: 'BR', away: 'PY', score_home: 0, score_away: 0,
            predictions: { 'MARCELO': [2,0], 'FERNANDO': [3,1], 'DANIEL': [2,0], 'ALAN': [2,0], 'RICARDO': [3,0], 'LINDOALDO': [2,0], 'CLODOALDO': [2,1] }
        },
        {
            round: 'Quartas de Final', home: 'VE', away: 'AR', score_home: 0, score_away: 2,
            predictions: { 'MARCELO': [0,1], 'FERNANDO': [1,2], 'DANIEL': [1,2], 'ALAN': [0,3], 'RICARDO': [1,2], 'LINDOALDO': [1,2], 'CLODOALDO': [1,2] }
        },
        {
            round: 'Quartas de Final', home: 'CO', away: 'CL', score_home: 0, score_away: 0,
            predictions: { 'MARCELO': [1,2], 'FERNANDO': [2,1], 'DANIEL': [2,1], 'ALAN': [1,1], 'RICARDO': [2,1], 'LINDOALDO': [1,0], 'CLODOALDO': [2,1] }
        },
        {
            round: 'Quartas de Final', home: 'UY', away: 'PE', score_home: 0, score_away: 0,
            predictions: { 'MARCELO': [3,0], 'FERNANDO': [2,1], 'DANIEL': [2,0], 'ALAN': [3,1], 'RICARDO': [2,0], 'LINDOALDO': [1,0], 'CLODOALDO': [2,0] }
        },

        // Semifinal
        {
            round: 'Semifinal', home: 'BR', away: 'AR', score_home: 2, score_away: 0,
            predictions: { 'MARCELO': [1,0], 'FERNANDO': [2,1], 'DANIEL': [3,1], 'ALAN': [2,1], 'RICARDO': [3,0], 'LINDOALDO': [2,1], 'CLODOALDO': [1,2] }
        },
        {
            round: 'Semifinal', home: 'CL', away: 'PE', score_home: 0, score_away: 3,
            predictions: { 'MARCELO': [2,0], 'FERNANDO': [2,0], 'DANIEL': [2,0], 'ALAN': [1,0], 'RICARDO': [1,2], 'LINDOALDO': [1,2], 'CLODOALDO': [1,0] }
        },

        // 3º Lugar
        {
            round: '3º Lugar', home: 'AR', away: 'CL', score_home: 2, score_away: 1,
            predictions: { 'MARCELO': [1,0], 'FERNANDO': [2,1], 'DANIEL': [2,1], 'ALAN': [2,1], 'RICARDO': [0,2], 'LINDOALDO': [2,1], 'CLODOALDO': [2,1] }
        },

        // Final
        {
            round: 'Final', home: 'BR', away: 'PE', score_home: 3, score_away: 1,
            predictions: { 'MARCELO': [4,0], 'FERNANDO': [3,0], 'DANIEL': [2,0], 'ALAN': [3,1], 'RICARDO': [1,1], 'LINDOALDO': [2,1], 'CLODOALDO': [2,1] }
        }
    ]
};
