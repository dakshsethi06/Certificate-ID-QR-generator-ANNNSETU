import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { id, timestamp, name, position } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const store = getStore("certificates");
    await store.set(id, JSON.stringify({ 
      id, 
      timestamp: timestamp || new Date().toISOString(),
      name: name || '',
      position: position || ''
    }));

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
