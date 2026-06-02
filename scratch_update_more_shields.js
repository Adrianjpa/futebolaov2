require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const shieldMap = {
        'Inter Miami': 'https://media.api-sports.io/football/teams/9568.png',
        'Porto': 'https://media.api-sports.io/football/teams/212.png',
        'Botafogo': 'https://media.api-sports.io/football/teams/120.png',
        'Chelsea FC': 'https://media.api-sports.io/football/teams/49.png',
        'Boca Juniors': 'https://media.api-sports.io/football/teams/451.png',
        'Benfica': 'https://media.api-sports.io/football/teams/211.png',
        'Fluminense': 'https://media.api-sports.io/football/teams/124.png',
        'Borussia Dortmund': 'https://media.api-sports.io/football/teams/165.png',
        'River Plate': 'https://media.api-sports.io/football/teams/435.png',
        'Internazionale': 'https://media.api-sports.io/football/teams/505.png',
        'Juventus FC': 'https://media.api-sports.io/football/teams/496.png',
        'Monterrey': 'https://media.api-sports.io/football/teams/2284.png',
        'Pachuca': 'https://media.api-sports.io/football/teams/2286.png',
        'Salzburg': 'https://media.api-sports.io/football/teams/571.png',
        'Al Hilal': 'https://media.api-sports.io/football/teams/2994.png',
        'Al Ahly': 'https://media.api-sports.io/football/teams/3419.png',
        'Urawa Red': 'https://media.api-sports.io/football/teams/297.png',
        'Ulsan HD': 'https://media.api-sports.io/football/teams/2950.png',
        'Wydad AC': 'https://media.api-sports.io/football/teams/1183.png',
        'Espérance': 'https://media.api-sports.io/football/teams/1184.png',
        'M. Sundowns': 'https://media.api-sports.io/football/teams/1182.png',
        'Al Ain': 'https://media.api-sports.io/football/teams/3004.png',
        'LAFC': 'https://media.api-sports.io/football/teams/253.png',
        'S. Sounders': 'https://media.api-sports.io/football/teams/254.png',
        'Auckland City': 'https://media.api-sports.io/football/teams/2967.png',
    };
    
    for (const [name, url] of Object.entries(shieldMap)) {
        const { error } = await supabase.from('teams').update({ shield_url: url }).eq('name', name);
        if (error) {
            console.error("Error updating", name, error);
        } else {
            console.log("Successfully updated shield for", name);
        }
    }
}
run();
