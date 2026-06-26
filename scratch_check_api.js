require('dotenv').config({ path: '.env.local' });

async function check() {
    try {
        const res = await fetch(`http://api.football-data.org/v4/matches/537393`, {
            headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY }
        });
        const data = await res.json();
        console.log("API Status:", data.status);
        console.log("API Score:", data.score);
    } catch (e) {
        console.error("Error fetching from API:", e.message);
    }
}
check();
