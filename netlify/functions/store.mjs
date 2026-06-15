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
    return false;
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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Require admin auth
  if (!authenticate(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { id, timestamp, name, position } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    }

    // Validate input lengths
    if (name && name.length > 255) {
      return new Response(JSON.stringify({ error: "Name is too long" }), { status: 400 });
    }
    if (position && position.length > 255) {
      return new Response(JSON.stringify({ error: "Position is too long" }), { status: 400 });
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

    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error('store error:', e);
    return new Response(JSON.stringify({ error: "Failed to store certificate." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/store"
};
