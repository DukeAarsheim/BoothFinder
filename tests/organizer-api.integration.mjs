// Opt-in integration test: fake Supabase and AI services, never the live database.
// Run: npm run test:integration (stop any local Next dev server in this checkout first).
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

const approvedId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const counts = new Map();
const published = [];
let failLimiter = false;
const fake = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const data = Buffer.concat(chunks).toString();
  const url = new URL(req.url, "http://localhost");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/auth/v1/user") {
    const token = req.headers.authorization;
    const id = token === "Bearer approved-token" ? approvedId : token === "Bearer other-token" ? otherId : null;
    if (!id) { res.writeHead(401); return res.end(JSON.stringify({ message: "Invalid token" })); }
    return res.end(JSON.stringify({ id, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: { role: "host" } }));
  }
  if (url.pathname === "/rest/v1/rpc/consume_organizer_api_limit") {
    if (failLimiter) { res.writeHead(503); return res.end(JSON.stringify({ message: "Unavailable" })); }
    const body = JSON.parse(data);
    const key = `${body.p_user_id}:${body.p_action}`;
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return res.end(JSON.stringify(count > body.p_limit ? 60 : 0));
  }
  if (url.pathname === "/rest/v1/events" && req.method === "POST") {
    published.push(JSON.parse(data));
    res.writeHead(201);
    return res.end(JSON.stringify({ id: "00000000-0000-4000-8000-000000000099" }));
  }
  if (url.pathname === "/v1/chat/completions") {
    const request = JSON.parse(data);
    const extractor = request.messages[0].content.startsWith("You read vendor application");
    const content = extractor
      ? JSON.stringify({ name: "Demo Market", booth_fee_min: 9999, expected_attendance: 999999,
          evidence: { name: "Demo Market welcomes vendors.", booth_fee_min: "Food booths cost $250." } })
      : "This is a sample answer.";
    return res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  }
  res.writeHead(404);
  res.end("{}");
});

fake.listen(0, "127.0.0.1");
await once(fake, "listening");
const fakePort = fake.address().port;
const probe = http.createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const appPort = probe.address().port;
await new Promise((resolve) => probe.close(resolve));

const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-p", String(appPort)], {
  env: { ...process.env, WATCHPACK_POLLING: "true", NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fakePort}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake", SUPABASE_SERVICE_ROLE_KEY: "fake",
    BOOTHFINDER_ORGANIZER_IDS: approvedId, AI_API_KEY: "fake", AI_BASE_URL: `http://127.0.0.1:${fakePort}/v1`, AI_MODEL: "fake" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
app.stdout.on("data", (part) => { logs += part; });
app.stderr.on("data", (part) => { logs += part; });
const base = `http://127.0.0.1:${appPort}`;
const token = (value) => ({ Authorization: `Bearer ${value}` });
const jsonPost = (body, bearer = "approved-token") => ({ method: "POST", headers: { ...token(bearer), "Content-Type": "application/json" }, body: JSON.stringify(body) });

try {
  const deadline = Date.now() + 30000;
  for (;;) {
    if (app.exitCode !== null) throw new Error(`App exited during startup: ${logs}`);
    try { if ((await fetch(`${base}/rate`)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error(`App didn't start: ${logs}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  for (const path of ["/api/events", "/api/extract", "/api/organizer-assistant"]) {
    assert.equal((await fetch(base + path, { method: "POST" })).status, 401, path);
  }
  assert.equal((await fetch(`${base}/api/events`, jsonPost({ fields: { name: "Forbidden" } }, "bad-token"))).status, 401);
  assert.equal((await fetch(`${base}/api/events`, jsonPost({ fields: { name: "Forbidden" } }, "other-token"))).status, 403);
  assert.equal(published.length, 0);
  assert.equal((await fetch(`${base}/api/events`, jsonPost(null))).status, 400);
  const saved = await fetch(`${base}/api/events`, jsonPost({ fields: { name: "Isolated test" } }));
  assert.equal(saved.status, 201);
  assert.equal(published.length, 1);
  assert.equal(published[0].is_sample, false);

  const form = new FormData();
  form.set("text", "Demo Market welcomes vendors. Food booths cost $250. Applications are available through the event organizers.");
  const extraction = await fetch(`${base}/api/extract`, { method: "POST", headers: token("approved-token"), body: form });
  assert.equal(extraction.status, 200);
  const output = await extraction.json();
  assert.equal(output.fields.name, "Demo Market");
  assert.equal(output.fields.booth_fee_min, null);
  assert.equal(output.fields.expected_attendance, null);

  const privateUrl = new FormData();
  privateUrl.set("url", `http://127.0.0.1:${fakePort}/private`);
  assert.equal((await fetch(`${base}/api/extract`, { method: "POST", headers: token("approved-token"), body: privateUrl })).status, 422);
  failLimiter = true;
  assert.equal((await fetch(`${base}/api/events`, jsonPost({ fields: { name: "Unavailable" } }))).status, 503);
  failLimiter = false;
  for (let i = 0; i < 20; i++) {
    assert.equal((await fetch(`${base}/api/organizer-assistant`, jsonPost({ messages: [{ role: "user", content: "Hello" }] }))).status, 200);
  }
  const limited = await fetch(`${base}/api/organizer-assistant`, jsonPost({ messages: [{ role: "user", content: "Hello" }] }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.equal((await fetch(`${base}/events`, { redirect: "manual" })).headers.get("location"), "/vendor");
  assert.equal((await fetch(`${base}/extract`, { redirect: "manual" })).headers.get("location"), "/host/dashboard/create");
  assert.match(await (await fetch(`${base}/rate`)).text(), /On the roadmap/);
  console.log("Organizer API integration passed: authentication, approval, fail-closed limits, extraction evidence, private URLs, and navigation");
} catch (error) {
  console.error(error);
  console.error(logs);
  process.exitCode = 1;
} finally {
  app.kill("SIGTERM");
  await new Promise((resolve) => fake.close(resolve));
}
