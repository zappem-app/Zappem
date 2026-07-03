import { scanPayload } from "./scam-engine.js";

const sample = {
  text: "Package notice. Click https://delivery-update.example.click to confirm.",
  screenshotName: ""
};

const db = { scams: {}, events: [] };

function zap(payload) {
  const scan = scanPayload(payload);
  const existing = db.scams[scan.fingerprint];
  const confirmations = (existing?.confirmations || 0) + 1;

  db.scams[scan.fingerprint] = {
    fingerprint: scan.fingerprint,
    target: scan.target,
    score: Math.max(scan.score, existing?.score || 0),
    confirmations,
    action: confirmations >= 2 || scan.score >= 70 ? "auto_block" : "watch",
    reportTargets: [...new Set([...(existing?.reportTargets || []), ...scan.reportTargets])]
  };

  return db.scams[scan.fingerprint];
}

const firstZap = zap(sample);
const secondZap = zap(sample);

console.log(JSON.stringify({
  sameFingerprint: firstZap.fingerprint === secondZap.fingerprint,
  firstAction: firstZap.action,
  secondAction: secondZap.action,
  confirmations: secondZap.confirmations,
  reportTargets: secondZap.reportTargets
}, null, 2));
