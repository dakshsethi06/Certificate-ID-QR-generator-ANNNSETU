import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { id, timestamp, name, position } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/store"
};
