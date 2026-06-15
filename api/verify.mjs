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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    }

    // Validate ID format (only allow expected characters)
    if (!/^[A-Z0-9\-]{1,50}$/.test(id)) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await pool.query('SELECT * FROM certificates WHERE id = $1', [id]);

    if (result.rows.length > 0) {
      return new Response(JSON.stringify({ valid: true, certificate: result.rows[0] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (e) {
    console.error('verify error:', e);
    return new Response(JSON.stringify({ error: "Verification failed. Please try again." }), { status: 500 });
  }
};
