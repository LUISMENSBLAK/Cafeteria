const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Proyecto360@db.kncginqczektypbtdzmv.supabase.co:5432/postgres';

async function runMigrations() {
  console.log('Conectando a la base de datos...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Conectado exitosamente.');
    
    // Obtener lista de archivos en supabase/migrations
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Asegura orden cronológico
      
    console.log(`Encontradas ${files.length} migraciones.`);
    
    for (const file of files) {
      console.log(`\nEjecutando ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`✅ ${file} completada.`);
      } catch (err) {
        console.error(`❌ Error en ${file}:`, err.message);
        // Opcional: detener la ejecución si una falla
        // throw err;
      }
    }
    
    console.log('\n🎉 Todas las migraciones fueron procesadas.');
  } catch (err) {
    console.error('Error general:', err);
  } finally {
    await client.end();
  }
}

runMigrations();
