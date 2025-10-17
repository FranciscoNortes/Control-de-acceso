const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.db');
const db = new Database(DB_PATH);

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  console.log('\n🔧 Crear nuevo administrador\n');
  
  const username = await question('Usuario: ');
  const password = await question('Contraseña: ');

  if (!username || !password) {
    console.log('❌ Usuario y contraseña son requeridos');
    rl.close();
    return;
  }

  if (password.length < 6) {
    console.log('❌ La contraseña debe tener al menos 6 caracteres');
    rl.close();
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)');
    stmt.run(username, hashedPassword);
    console.log(`✅ Administrador '${username}' creado exitosamente`);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log(`❌ El usuario '${username}' ya existe`);
    } else {
      console.log('❌ Error al crear administrador:', error.message);
    }
  }

  rl.close();
}

createAdmin();
