require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const updates = [
        { id: 'afedaaad-b171-4818-9861-44c08530b15c', shield_url: 'https://media.api-sports.io/football/teams/541.png' }, // Real Madrid
        { id: '054a2840-8423-4459-8bd7-ea9e280da7dd', shield_url: 'https://media.api-sports.io/football/teams/50.png' }, // M. City
        { id: '0ac5262a-8a1a-416a-9912-834e938f81ef', shield_url: 'https://media.api-sports.io/football/teams/85.png' }, // PSG
        { id: '9e7fda28-f650-4f48-8b18-2c16f95aae11', shield_url: 'https://media.api-sports.io/football/teams/121.png' }, // Palmeiras
        { id: 'dfc268a6-e619-476b-b83a-0fca4a0281e9', shield_url: 'https://media.api-sports.io/football/teams/530.png' }, // Atl. Madrid
        { id: '424e7531-6efc-450a-8883-867a1629c482', shield_url: 'https://media.api-sports.io/football/teams/127.png' }, // Flamengo
        { id: '602b8b26-a461-4b32-bcdd-ca54498055f3', shield_url: 'https://media.api-sports.io/football/teams/157.png' }  // Bayern
    ];
    
    for (const team of updates) {
        const { error } = await supabase.from('teams').update({ shield_url: team.shield_url }).eq('id', team.id);
        if (error) {
            console.error("Error updating", team.id, error);
        } else {
            console.log("Successfully updated shield for", team.id);
        }
    }
}
run();
