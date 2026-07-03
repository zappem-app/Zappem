import { scanPayload } from "./scam-engine.js";

const sample = {
  text: "Payment Decliiiiiiined Your iCloud storage plan will be permanently deleted. Click https://icloud-payments.example.click now.",
  screenshotName: "icloud-scam.png"
};

const first = scanPayload(sample);
const second = scanPayload(sample);

console.log(JSON.stringify({
  sameFingerprint: first.fingerprint === second.fingerprint,
  fingerprint: first.fingerprint,
  score: first.score,
  reasons: first.reasons,
  reportTargets: first.reportTargets
}, null, 2));
