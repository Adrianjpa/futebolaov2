const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'profiles',
  'teams',
  'championships',
  'championship_participants',
  'matches',
  'predictions'
];

async function fetchAllRows(tableName) {
  let allData = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + step - 1);
      
    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    from += step;
    
    if (data.length < step) break; // Finished
  }
  
  return allData;
}

async function runBackup() {
  console.log("Iniciando backup do banco de dados...");
  const backupData = {};
  
  for (const table of TABLES) {
    console.log(`Fazendo download da tabela: ${table}...`);
    const data = await fetchAllRows(table);
    backupData[table] = data;
    console.log(` -> ${data.length} registros salvos.`);
  }
  
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_futebolao_Completo_${dateStr}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
  console.log(`\n✅ Backup concluído com sucesso!`);
  console.log(`Arquivo salvo como: ${filename}`);
  console.log(`Tamanho do arquivo: ${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)} MB`);
}

runBackup();
