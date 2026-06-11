const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const PORT = 8080;
const DB_FILE = path.join(__dirname, 'certificates.json');

// ── Certificate Database ────────────────────────────────────────────────────
function loadDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// ── Server ──────────────────────────────────────────────────────────────────
http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── API: Store a new certificate ──────────────────────────────────────
  if (pathname === '/api/store' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id, timestamp } = JSON.parse(body);
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing id' }));
          return;
        }
        const db = loadDB();
        db[id] = {
          id,
          timestamp: timestamp || new Date().toISOString(),
        };
        saveDB(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── API: Verify a certificate ─────────────────────────────────────────
  if (pathname === '/api/verify' && req.method === 'GET') {
    const certId = parsed.query.id;
    const db = loadDB();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (certId && db[certId]) {
      res.end(JSON.stringify({ valid: true, certificate: db[certId] }));
    } else {
      res.end(JSON.stringify({ valid: false }));
    }
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
