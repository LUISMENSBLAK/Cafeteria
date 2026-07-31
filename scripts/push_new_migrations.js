const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Proyecto360@db.kncginqczektypbtdzmv.supabase.co:5432/postgres';

async function runNewMigrations() {
  console.log('Conectando a la base de datos...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Conectado exitosamente.');
    
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    // Solo vamos a subir las dos migraciones nuevas para Fase 1
    const filesToRun = [
      '20260730000000_dynamic_theming.sql',
      '20260730000001_multi_tenant.sql'
    ];
    
    console.log(`Encontradas ${filesToRun.length} migraciones pendientes.`);
    
    for (const file of filesToRun) {
      console.log(`\nEjecutando ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`✅ ${file} completada con éxito.`);
      } catch (err) {
        console.error(`❌ Error en ${file}:`, err.message);
        throw err; // Paramos si falla la primera para no corromper el esquema
      }
    }
    
    console.log('\n🎉 ¡Las migraciones nuevas fueron subidas a producción exitosamente!');
  } catch (err) {
    console.error('Error general de conexión o ejecución:', err);
  } finally {
    await client.end();
  }
}

runNewMigrations();
