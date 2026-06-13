import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async (req, context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    // Ensure the table exists in the new Supabase database
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        name VARCHAR(255),
        position VARCHAR(255)
      )
    `);

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || 'INT';

    if (type !== 'INT' && type !== 'EMP') {
      return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });
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

    // Reserve it
    await pool.query(
      "INSERT INTO certificates (id, timestamp) VALUES ($1, $2)",
      [nextId, new Date().toISOString()]
    );

    return new Response(JSON.stringify({ id: nextId }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/next-id"
};
