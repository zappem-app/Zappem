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
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/,"">");
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    // read as buffer first
    const bodyBuf = await readFile(filePath);
    const ext = extname(filePath);

    // If serving the index page, inject small client-side glue to wire up UI
    if (ext === ".html" && filePath.endsWith("index.html")) {
      let body = bodyBuf.toString("utf8");
      const injection = `\n<script>document.addEventListener('DOMContentLoaded', function(){
  try {
    const scanButton = document.querySelector('#scanLink');
    const zapButton = document.querySelector('#zapLink');
    const notScamButton = document.querySelector('#notScamLink');
    const clearButton = document.querySelector('#clearButton');
    const screenshotInput = document.querySelector('#screenshotInput');
    const fileLabel = document.querySelector('.file-label');
    const dropZone = document.querySelector('#dropZone');
    const message = document.querySelector('#message');
    const screenshotPreview = document.querySelector('#screenshotPreview');

    function toDataURL(file, cb){
      const reader = new FileReader();
      reader.onload = () => cb(reader.result);
      reader.readAsDataURL(file);
    }

    if (fileLabel && screenshotInput) {
      fileLabel.addEventListener('click', function(e){ e.preventDefault(); screenshotInput.click(); });
    }

    if (screenshotInput) {
      // prefer camera on mobile where supported
      try { screenshotInput.setAttribute('capture', 'environment'); } catch(e){}
      screenshotInput.addEventListener('change', function(e){
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        // expose global screenshotInfo used by inline script
        window.screenshotInfo = { name: file.name };
        toDataURL(file, function(data){
          if (screenshotPreview) { screenshotPreview.src = data; screenshotPreview.style.display = 'block'; }
          if (typeof window.status !== 'undefined') { /* noop - status element handled by page scripts */ }
        });
      });
    }

    // drag & drop on drop zone
    if (dropZone) {
      ['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, function(e){ e.preventDefault(); dropZone.classList.add('dragover'); }));
      ['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, function(e){ e.preventDefault(); dropZone.classList.remove('dragover'); }));
      dropZone.addEventListener('drop', function(e){
        e.preventDefault();
        const file = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
        if (!file || !screenshotInput) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        screenshotInput.files = dt.files;
        screenshotInput.dispatchEvent(new Event('change'));
      });
    }

    // paste handling (images or text)
    document.addEventListener('paste', function(e){
      try {
        if (!e.clipboardData) return;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type && item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (!file || !screenshotInput) return;
            const dt = new DataTransfer();
            dt.items.add(file);
            screenshotInput.files = dt.files;
            screenshotInput.dispatchEvent(new Event('change'));
            return;
          }
        }
        const text = e.clipboardData.getData('text');
        if (text && message) { message.focus(); message.value = text; }
      } catch (err) { console.error(err); }
    });

    // wire actions to the functions defined in the inline script
    if (scanButton) scanButton.addEventListener('click', function(e){ e.preventDefault(); if (typeof window.scan === 'function') window.scan(); });
    if (zapButton) zapButton.addEventListener('click', function(e){ e.preventDefault(); if (typeof window.zap === 'function') window.zap(); });

    if (notScamButton) notScamButton.addEventListener('click', async function(e){
      e.preventDefault();
      try {
        if (typeof window.apiPost === 'function') {
          await window.apiPost('/api/not-scam', { text: (message && message.value) || '', screenshotName: (window.screenshotInfo && window.screenshotInfo.name) || '' });
          if (typeof window.renderReviewQueue === 'function') window.renderReviewQueue();
          if (typeof window.renderDecision === 'function') window.renderDecision('review');
          if (typeof window.renderServerStats === 'function') window.renderServerStats();
        }
      } catch (err) { console.error(err); }
    });

    if (clearButton) clearButton.addEventListener('click', function(e){ e.preventDefault(); try { localStorage.removeItem('zappem-blocklist'); if (typeof window.renderBlocklist === 'function') window.renderBlocklist(); if (typeof window.renderStats === 'function') window.renderStats(); if (typeof window.renderServerStats === 'function') window.renderServerStats(); } catch (err) { console.error(err); } });

    // run initial renders if present
    if (typeof window.renderBlocklist === 'function') window.renderBlocklist();
    if (typeof window.renderStats === 'function') window.renderStats();
    if (typeof window.renderReviewQueue === 'function') window.renderReviewQueue();
  } catch (e) { console.error('Injection error', e); }
});</script>\n`;

      // insert injection before closing </body>
      if (body.indexOf('</body>') !== -1) {
        body = body.replace('</body>', injection + '</body>');
      } else {
        body += injection;
      }

      const outBuf = Buffer.from(body, 'utf8');
      res.writeHead(200, { "content-type": mimeTypes[ext] || "application/octet-stream" });
      return res.end(outBuf);
    }

    // otherwise serve as-is
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(bodyBuf);
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
