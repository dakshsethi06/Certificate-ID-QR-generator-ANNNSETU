require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Pool } = require('pg');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const PORT = process.env.PORT || 8080;

// ── PostgreSQL Database ─────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    // If you do not have DATABASE_URL set, pool.query will throw an error.
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL is not set. Database will not be initialized.');
      return;
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL
      )
    `);
    await pool.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
    await pool.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS position VARCHAR(255)`);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Initialize database on startup
initDB();

// ── Server ──────────────────────────────────────────────────────────────────
http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── API: Get next sequential ID ───────────────────────────────────────
  if (pathname === '/api/next-id' && req.method === 'GET') {
    const type = parsed.query.type || 'INT';
    if (type !== 'INT' && type !== 'EMP') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid type' }));
      return;
    }
    const year = new Date().getFullYear();
    const prefix = `PAN-${type}-${year}-`;
    
    try {
      const result = await pool.query(
        "SELECT id FROM certificates WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
        [`${prefix}%`]
      );
      
      let nextNum = 1;
      if (result.rows.length > 0) {
        const lastId = result.rows[0].id;
        const lastNumStr = lastId.replace(prefix, '');
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      
      const nextId = `${prefix}${String(nextNum).padStart(3, '0')}`;
      
      // Reserve it
      await pool.query(
        "INSERT INTO certificates (id, timestamp) VALUES ($1, $2)",
        [nextId, new Date().toISOString()]
      );
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: nextId }));
    } catch (e) {
      console.error('Error getting next ID:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Database error occurred' }));
    }
    return;
  }

  // ── API: Store a new certificate ──────────────────────────────────────
  if (pathname === '/api/store' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { id, timestamp, name, position } = JSON.parse(body);
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing id' }));
          return;
        }
        
        const certTimestamp = timestamp || new Date().toISOString();
        
        await pool.query(
          `INSERT INTO certificates (id, timestamp, name, position) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (id) DO UPDATE SET 
             timestamp = EXCLUDED.timestamp, 
             name = EXCLUDED.name, 
             position = EXCLUDED.position`,
          [id, certTimestamp, name || '', position || '']
        );
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id }));
      } catch (e) {
        console.error('Error storing certificate:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database error occurred' }));
      }
    });
    return;
  }

  // ── API: Verify a certificate ─────────────────────────────────────────
  if (pathname === '/api/verify' && req.method === 'GET') {
    const certId = parsed.query.id;
    
    if (!certId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, error: 'Missing id' }));
      return;
    }
    
    pool.query('SELECT * FROM certificates WHERE id = $1', [certId])
      .then(result => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (result.rows.length > 0) {
          res.end(JSON.stringify({ valid: true, certificate: result.rows[0] }));
        } else {
          res.end(JSON.stringify({ valid: false }));
        }
      })
      .catch(e => {
        console.error('Error verifying certificate:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database error occurred' }));
      });
    return;
  }

  // ── Static file serving ───────────────────────────────────────────────
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const absPath = path.join(__dirname, decodeURIComponent(filePath));

  fs.readFile(absPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Verification page: http://localhost:${PORT}/verify.html`);
});
