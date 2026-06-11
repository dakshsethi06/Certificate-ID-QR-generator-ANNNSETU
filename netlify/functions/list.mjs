import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  // Only allow GET
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const store = getStore("certificates");
    const { blobs } = await store.list();
    
    // Fetch the actual data for each blob
    const certificates = await Promise.all(
      blobs.map(async (blob) => {
        const data = await store.get(blob.key);
        return JSON.parse(data);
      })
    );

    // Sort by timestamp descending (newest first)
    certificates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return new Response(JSON.stringify({ success: true, certificates }), {
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
  path: "/api/list"
};
