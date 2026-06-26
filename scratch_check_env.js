const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
console.log(env.split('\n').map(line => line.split('=')[0]).join(', '));
