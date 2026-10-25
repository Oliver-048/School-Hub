import { getStore } from "@netlify/blobs";

// Passwords live here on the server, never in the page. Optionally override
// them in Netlify: Site configuration > Environment variables.
const ENTRY = Netlify.env.get("ENTRY_PASSWORD") || "150408Oc";
const EDIT = Netlify.env.get("EDIT_PASSWORD") || "150408Oc";

export const config = { path: ["/api/hub", "/api/hub/check"] };

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.headers.get("x-entry") !== ENTRY) return json({ error: "entry" }, 401);
  const canEdit = req.headers.get("x-edit") === EDIT;
  const store = getStore("school-hub");
  let data = await store.get("data", { type: "json" });
  if (!data) data = { links: [], events: [] };

  if (req.method === "GET") return json({ data, canEdit });

  if (req.method === "PUT") {
    if (!canEdit) return json({ error: "edit" }, 401);
    const b = await req.json();
    if (!b.data || !Array.isArray(b.data.links) || !Array.isArray(b.data.events))
      return json({ error: "bad" }, 400);
    await store.setJSON("data", b.data);
    return json({ ok: true });
  }

  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/check")) {
    const { i, n, d, v } = await req.json();
    const e = data.events[i];
    if (!e || e.n !== n) return json({ error: "stale" }, 409);
    if (e.r) {
      e.dn = e.dn || {};
      if (v) e.dn[d] = 1; else delete e.dn[d];
    } else e.done = !!v;
    await store.setJSON("data", data);
    return json({ ok: true });
  }
  return json({ error: "bad" }, 400);
};
