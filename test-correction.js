import { scanPayload } from "./scam-engine.js";

const sample = {
  text: "Package notice. Click https://delivery-update.example.click to confirm.",
  screenshotName: ""
};

const db = { scams: {}, corrections: [] };

function zap(payload) {
  const scan = scanPayload(payload);
  const existing = db.scams[scan.fingerprint];
  const confirmations = (existing?.confirmations || 0) + 1;

  db.scams[scan.fingerprint] = {
    fingerprint: scan.fingerprint,
    target: scan.target,
    confirmations,
    notScamVotes: existing?.notScamVotes || 0,
    action: confirmations >= 2 || scan.score >= 70 ? "auto_block" : "watch"
  };

  return db.scams[scan.fingerprint];
}

function notScam(payload) {
  const scan = scanPayload(payload);
  const existing = db.scams[scan.fingerprint];
  existing.notScamVotes = (existing.notScamVotes || 0) + 1;
  existing.action = existing.notScamVotes >= 1 ? "review" : existing.action;
  db.corrections.push({ fingerprint: scan.fingerprint, target: scan.target });
  return existing;
}

zap(sample);
const blocked = zap(sample);
const blockedAction = blocked.action;
const reviewed = notScam(sample);

console.log(JSON.stringify({
  blockedAction,
  reviewAction: reviewed.action,
  notScamVotes: reviewed.notScamVotes,
  corrections: db.corrections.length
}, null, 2));
