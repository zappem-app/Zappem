import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { scanPayload } from "./scam-engine.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataDir = join(root, "data");
const dbPath = join(dataDir, "blocklist.json");
const port = Number(process.env.PORT || 4174);
const appVersion = "0.7.0";
const defaultTrust = 1;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    await writeFile(dbPath, JSON.stringify({ scams: {}, events: [] }, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  return JSON.parse(await readFile(dbPath, "utf8"));
}

async function writeDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/health") {
    return json(res, 200, {
      ok: true,
      app: "zappem",
      version: appVersion,
      storage: "local-json",
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === "GET" && req.url === "/api/stats") {
    const db = await readDb();
    const scams = Object.values(db.scams);
    return json(res, 200, {
      totalZaps: db.events.length,
      uniqueScams: scams.length,
      autoBlockReady: scams.filter(item => item.confirmations >= 2 || item.score >= 70).length,
      corrections: db.corrections?.length || 0,
      reviewQueue: scams.filter(item => item.action === "review").length,
      topScams: scams.sort((a, b) => b.confirmations - a.confirmations).slice(0, 8)
    });
  }

  if (req.method === "GET" && req.url === "/api/review-queue") {
    const db = await readDb();
    const reviewItems = Object.values(db.scams)
      .filter(item => item.action === "review")
      .sort((a, b) => (b.notScamWeight || 0) - (a.notScamWeight || 0))
      .slice(0, 25);
    return json(res, 200, { items: reviewItems });
  }

  if (req.method === "POST" && req.url === "/api/check") {
    const payload = await readBody(req);
    const scan = scanPayload(payload);
    const db = await readDb();
    const known = db.scams[scan.fingerprint];
    return json(res, 200, {
      ...scan,
      known: Boolean(known),
      action: known && (known.confirmations >= 2 || known.score >= 70) ? "auto_block" : "needs_zap",
      confirmations: known?.confirmations || 0
    });
  }

  if (req.method === "POST" && req.url === "/api/zap") {
    const payload = await readBody(req);
    const scan = scanPayload(payload);
    const db = await readDb();
    const now = new Date().toISOString();
    const existing = db.scams[scan.fingerprint];

    db.scams[scan.fingerprint] = {
      fingerprint: scan.fingerprint,
      target: scan.target,
      score: Math.max(scan.score, existing?.score || 0),
      reasons: [...new Set([...(existing?.reasons || []), ...scan.reasons])],
      reportTargets: [...new Set([...(existing?.reportTargets || []), ...scan.reportTargets])],
      confirmations: (existing?.confirmations || 0) + 1,
      firstSeen: existing?.firstSeen || now,
      lastSeen: now,
      action: (existing?.confirmations || 0) + 1 >= 2 || scan.score >= 70 ? "auto_block" : "watch"
    };

    db.events.unshift({
      at: now,
      fingerprint: scan.fingerprint,
      target: scan.target,
      score: scan.score
    });

    db.events = db.events.slice(0, 500);
    await writeDb(db);

    return json(res, 200, {
      saved: true,
      ...db.scams[scan.fingerprint],
      totalZaps: db.events.length
    });
  }

  if (req.method === "POST" && req.url === "/api/not-scam") {
    const payload = await readBody(req);
    const scan = scanPayload(payload);
    const db = await readDb();
    const now = new Date().toISOString();
    const existing = db.scams[scan.fingerprint];

    db.corrections ||= [];
    db.corrections.unshift({
      at: now,
      fingerprint: scan.fingerprint,
      target: scan.target,
      reason: payload.reason || "User marked as not a scam"
    });
    db.corrections = db.corrections.slice(0, 500);

    if (existing) {
      const trustWeight = Math.max(0, Number(payload.trustWeight || defaultTrust));
      existing.notScamVotes = (existing.notScamVotes || 0) + 1;
      existing.notScamWeight = (existing.notScamWeight || 0) + trustWeight;
      existing.lastCorrection = now;
      existing.action = "review";
      existing.reviewReason = existing.notScamWeight >= 3 ? "Trusted corrections marked this as not a scam" : "User correction received";
    }

    await writeDb(db);

    return json(res, 200, {
      saved: true,
      fingerprint: scan.fingerprint,
      target: scan.target,
      action: existing?.action || "review",
      notScamVotes: existing?.notScamVotes || 1,
      notScamWeight: existing?.notScamWeight || Number(payload.trustWeight || defaultTrust),
      message: "Correction saved. This fingerprint should be reviewed before blocking."
    });
  }

  return json(res, 404, { error: "not_found" });
}

async function serveStatic(req, res) {
  const requested = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) return await handleApi(req, res);
    return await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "server_error" });
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`ZAPP'EM v${appVersion} running at http://localhost:${port}`);
});
