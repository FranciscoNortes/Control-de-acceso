const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 7000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

// Ruta de la base de datos
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.db');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Inicializar base de datos
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS room_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    is_occupied BOOLEAN DEFAULT 0,
    occupied_by TEXT,
    occupied_since DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS access_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    reason TEXT,
    requested_date TEXT NOT NULL,
    requested_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS request_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    admin_username TEXT NOT NULL,
    decision TEXT NOT NULL,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES access_requests(id) ON DELETE CASCADE
  );

  INSERT OR IGNORE INTO room_status (id, is_occupied) VALUES (1, 0);
`);

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ============ RUTAS PÚBLICAS ============

// Obtener estado de la sala (público)
app.get('/api/status', (req, res) => {
  const status = db.prepare(`
    SELECT *, 
    strftime('%s', occupied_since) * 1000 as occupied_since_ms 
    FROM room_status WHERE id = 1
  `).get();
  
  res.json({
    isOccupied: Boolean(status.is_occupied),
    occupiedBy: status.occupied_by,
    occupiedSince: status.occupied_since_ms ? parseInt(status.occupied_since_ms) : null,
    roomName: process.env.ROOM_NAME || 'Sala'
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (!admin) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const validPassword = bcrypt.compareSync(password, admin.password);

  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    sameSite: 'strict'
  });

  res.json({ success: true, username: admin.username });
});

// Crear solicitud de acceso (público)
app.post('/api/requests', (req, res) => {
  const { name, email, reason, requested_date, requested_time } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  if (name.trim().length < 3) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
  }

  if (!requested_date || !requested_time) {
    return res.status(400).json({ error: 'La fecha y hora son requeridas' });
  }

  try {
    const stmt = db.prepare('INSERT INTO access_requests (name, email, reason, requested_date, requested_time) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(name.trim(), email?.trim() || null, reason?.trim() || null, requested_date, requested_time);
    res.json({ 
      success: true, 
      message: 'Solicitud enviada correctamente',
      requestId: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// Consultar estado de solicitud (público)
app.get('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const request = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const reviews = db.prepare('SELECT * FROM request_reviews WHERE request_id = ? ORDER BY reviewed_at DESC').all(id);
    
    const approvals = reviews.filter(r => r.decision === 'approved').length;
    const rejections = reviews.filter(r => r.decision === 'rejected').length;
    const totalAdmins = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;

    res.json({
      ...request,
      reviews,
      approvals,
      rejections,
      totalAdmins,
      finalStatus: approvals > 0 ? 'approved' : (rejections === totalAdmins ? 'rejected' : 'pending')
    });
  } catch (error) {
    console.error('Error al consultar solicitud:', error);
    res.status(500).json({ error: 'Error al consultar la solicitud' });
  }
});

// ============ RUTAS PROTEGIDAS ============

// Verificar autenticación
app.get('/api/verify', authenticate, (req, res) => {
  res.json({ authenticated: true, username: req.user.username });
});

// Logout
app.post('/api/logout', authenticate, (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Marcar sala como ocupada
app.post('/api/occupy', authenticate, (req, res) => {
  const stmt = db.prepare(`
    UPDATE room_status 
    SET is_occupied = 1, 
        occupied_by = ?, 
        occupied_since = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `);
  
  stmt.run(req.user.username);
  
  const status = db.prepare('SELECT * FROM room_status WHERE id = 1').get();
  res.json({ success: true, status });
});

// Marcar sala como libre
app.post('/api/release', authenticate, (req, res) => {
  const stmt = db.prepare(`
    UPDATE room_status 
    SET is_occupied = 0, 
        occupied_by = NULL, 
        occupied_since = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `);
  
  stmt.run();
  
  const status = db.prepare('SELECT * FROM room_status WHERE id = 1').get();
  res.json({ success: true, status });
});

// Listar administradores
app.get('/api/admins', authenticate, (req, res) => {
  const admins = db.prepare('SELECT id, username, created_at FROM admins').all();
  res.json(admins);
});

// Crear administrador
app.post('/api/admins', authenticate, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)');
    stmt.run(username, hashedPassword);
    res.json({ success: true, message: 'Administrador creado' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'El usuario ya existe' });
    } else {
      res.status(500).json({ error: 'Error al crear administrador' });
    }
  }
});

// Eliminar administrador
app.delete('/api/admins/:id', authenticate, (req, res) => {
  const { id } = req.params;

  // Evitar que se elimine a sí mismo
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  }

  const stmt = db.prepare('DELETE FROM admins WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Administrador no encontrado' });
  }

  res.json({ success: true, message: 'Administrador eliminado' });
});

// Obtener solicitudes
app.get('/api/requests', authenticate, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT 
        ar.*,
        (SELECT COUNT(*) FROM request_reviews WHERE request_id = ar.id AND decision = 'approved') as approvals,
        (SELECT COUNT(*) FROM request_reviews WHERE request_id = ar.id AND decision = 'rejected') as rejections,
        (SELECT COUNT(*) FROM admins) as total_admins
      FROM access_requests ar
      ORDER BY ar.created_at DESC
    `).all();

    res.json(requests);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Revisar solicitud (aprobar/rechazar)
app.post('/api/requests/:id/review', authenticate, (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decisión inválida' });
  }

  try {
    // Verificar si el admin ya revisó esta solicitud
    const existingReview = db.prepare('SELECT * FROM request_reviews WHERE request_id = ? AND admin_username = ?').get(id, req.user.username);

    if (existingReview) {
      return res.status(400).json({ error: 'Ya has revisado esta solicitud' });
    }

    // Verificar que la solicitud existe
    const request = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Insertar la revisión
    const stmt = db.prepare('INSERT INTO request_reviews (request_id, admin_username, decision) VALUES (?, ?, ?)');
    stmt.run(id, req.user.username, decision);

    // Actualizar el estado de la solicitud si es necesario
    const reviews = db.prepare('SELECT * FROM request_reviews WHERE request_id = ?').all(id);
    const approvals = reviews.filter(r => r.decision === 'approved').length;
    const rejections = reviews.filter(r => r.decision === 'rejected').length;
    const totalAdmins = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;

    let newStatus = 'pending';
    if (approvals > 0) {
      newStatus = 'approved';
    } else if (rejections === totalAdmins) {
      newStatus = 'rejected';
    }

    db.prepare('UPDATE access_requests SET status = ? WHERE id = ?').run(newStatus, id);

    res.json({ 
      success: true, 
      message: `Solicitud ${decision === 'approved' ? 'aprobada' : 'rechazada'}`,
      newStatus
    });
  } catch (error) {
    console.error('Error al revisar solicitud:', error);
    res.status(500).json({ error: 'Error al procesar la revisión' });
  }
});

// Eliminar solicitud
app.delete('/api/requests/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM access_requests WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  res.json({ success: true, message: 'Solicitud eliminada' });
});

// Servir páginas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Vista pública: http://localhost:${PORT}`);
  console.log(`🔐 Panel admin: http://localhost:${PORT}/admin`);
  
  // Verificar si hay administradores
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    console.log('\n⚠️  No hay administradores. Crea uno con:');
    console.log('   node setup.js');
  }
});
