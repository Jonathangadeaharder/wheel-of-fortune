import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Database file path
const dbPath = path.join(__dirname, 'data.json');

// Load or initialize database
const loadDatabase = () => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed;
    } else {
      console.log('Database file does not exist, creating with defaults');
      const defaultDb = { wheelUnlocked: false, prizes: [], spinRequests: [] };
      saveDatabase(defaultDb);
      return defaultDb;
    }
  } catch (error) {
    console.error('Error loading database:', error);
    return { wheelUnlocked: false, prizes: [], spinRequests: [] };
  }
};

// Save database
const saveDatabase = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// API endpoint to get all data
app.get('/api/data', (req, res) => {
  const db = loadDatabase();
  res.json(db);
});

// API endpoint to update prizes
app.post('/api/prizes', (req, res) => {
  const db = loadDatabase();
  db.prizes = req.body;
  saveDatabase(db);
  console.log(`✅ Prizes updated (${req.body.length} prizes)`);
  res.json({ success: true, message: 'Prizes updated' });
});

// API endpoint to update spin requests
app.post('/api/spin-requests', (req, res) => {
  const db = loadDatabase();
  db.spinRequests = req.body;
  saveDatabase(db);
  const latestSpin = req.body[req.body.length - 1];
  if (latestSpin) {
    console.log(`🎰 Spin recorded: ${latestSpin.prize.name}`);
  }
  res.json({ success: true, message: 'Spin requests updated' });
});

// API endpoint to unlock the wheel
app.post('/api/unlock-wheel', (req, res) => {
  const db = loadDatabase();
  db.wheelUnlocked = true;
  saveDatabase(db);
  console.log('🔓 Wheel UNLOCKED');
  res.json({
    success: true,
    message: 'Wheel unlocked',
    wheelUnlocked: db.wheelUnlocked,
    timestamp: new Date().toISOString()
  });
});

// API endpoint to get wheel unlock status
app.get('/api/wheel-status', (req, res) => {
  const db = loadDatabase();
  res.json({
    unlocked: db.wheelUnlocked,
    timestamp: new Date().toISOString()
  });
});

// API endpoint to lock the wheel
app.post('/api/lock-wheel', (req, res) => {
  const db = loadDatabase();
  db.wheelUnlocked = false;
  saveDatabase(db);
  console.log('🔒 Wheel LOCKED');
  res.json({
    success: true,
    message: 'Wheel locked',
    wheelUnlocked: db.wheelUnlocked,
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server on all interfaces (0.0.0.0)
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================`);
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from localhost: http://localhost:${PORT}`);
  console.log(`Access from network: http://<your-ip>:${PORT}`);
  console.log(`\nDatabase file location: ${dbPath}`);
  console.log(`Database file exists: ${fs.existsSync(dbPath)}`);

  // Initialize database on startup
  const initialDb = loadDatabase();
  console.log(`Initial wheel state: ${initialDb.wheelUnlocked ? 'UNLOCKED' : 'LOCKED'}`);

  console.log(`\nAPI Endpoints:`);
  console.log(`  POST /api/unlock-wheel - Unlock the wheel`);
  console.log(`  POST /api/lock-wheel - Lock the wheel`);
  console.log(`  GET /api/wheel-status - Get wheel status`);
  console.log(`=================================\n`);
});

// Handle EADDRINUSE error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`Please stop the existing server or choose a different port.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force close after 5 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGHUP', shutdown);
