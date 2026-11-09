// Shared bingo board: one blob per player, keyed by lower-cased name.
// Honor system on purpose — anyone can write any name.
import { getStore } from "@netlify/blobs";

const SQUARES = 25;
const MAX_NAME = 24;

const store = () => getStore({ name: "bingo-v2", consistency: "strong" });
// Hex keeps keys to [0-9a-f]: percent-encoded keys get double-encoded by the
// blob store and then can't be read back from list().
const keyFor = (name) => Buffer.from(name.toLowerCase(), "utf8").toString("hex");

function cleanName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return name || null;
}

export default async (req) => {
  const s = store();

  if (req.method === "GET") {
    const { blobs } = await s.list();
    const players = (
      await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))
    ).filter(Boolean);
    return Response.json({ players }, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
    const name = cleanName(body?.name);
    const marks = body?.marks;
    if (!name) return new Response("Name required", { status: 400 });
    if (!Array.isArray(marks) || marks.length !== SQUARES) {
      return new Response(`marks must be ${SQUARES} booleans`, { status: 400 });
    }
    const player = { name, marks: marks.map(Boolean), updated: Date.now() };
    await s.setJSON(keyFor(name), player);
    return Response.json({ player });
  }

  return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST" } });
};

export const config = { path: "/api/board" };
