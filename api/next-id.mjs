import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Auth helper
function authenticate(req) {
  const authHeader = req.headers.get("authorization");
  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    return false; // Env vars not set — deny access
  }

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  return username === validUsername && password === validPassword;
}

export default async (req, context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Require admin auth to generate certificates
  if (!authenticate(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || 'INT';
    const name = (url.searchParams.get("name") || '').trim();

    if (type !== 'INT' && type !== 'EMP') {
      return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });
    }

    // Validate input lengths
    if (name.length > 255) {
      return new Response(JSON.stringify({ error: 'Name is too long (max 255 characters)' }), { status: 400 });
    }

    // Check for duplicate name (case-insensitive)
    if (name) {
      const dupCheck = await pool.query(
        "SELECT id FROM certificates WHERE LOWER(name) = LOWER($1)",
        [name]
      );
      if (dupCheck.rows.length > 0) {
        return new Response(JSON.stringify({ 
          error: `A certificate has already been issued to "${name}". Duplicate names are not allowed.` 
        }), { status: 409 });
      }
    }

    const year = new Date().getFullYear();
    const prefix = `PAN-${type}-${year}-`;

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

    // Reserve it with the name
    await pool.query(
      "INSERT INTO certificates (id, timestamp, name) VALUES ($1, $2, $3)",
      [nextId, new Date().toISOString(), name || null]
    );

    return new Response(JSON.stringify({ id: nextId }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error('next-id error:', e);
    return new Response(JSON.stringify({ error: "Failed to generate certificate ID. Please try again." }), { status: 500 });
  }
};
