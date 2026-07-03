import { createHash } from "node:crypto";

export const checks = [
  { label: "Scare deadline or threat language", weight: 22, pattern: /delete|deleted|loss|suspend|closed|inactive|over-limit|urgent|immediately|final notice/i },
  { label: "Payment or account problem claim", weight: 18, pattern: /payment|declined|renew|billing|invoice|storage plan|verify account/i },
  { label: "Weird spelling or stretched words", weight: 18, pattern: /(.)\1{4,}|decli{4,}ned|payrn|rnoney/i },
  { label: "Suspicious link or odd web address", weight: 18, pattern: /https?:\/\/|www\.|\.ru|\.top|\.click|\.zip|\.xyz|bit\.ly|tinyurl/i },
  { label: "Asks you to act outside the official app", weight: 14, pattern: /click|tap|open link|confirm|login|sign in|update now/i },
  { label: "Impersonates a known service", weight: 12, pattern: /apple|icloud|gmail|google|facebook|meta|paypal|usps|ups|fedex|amazon|trademark|domain/i }
];

export function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, " link ")
    .replace(/[^\w\s@.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSignal(text = "", screenshotName = "") {
  const link = text.match(/https?:\/\/[^\s]+|www\.[^\s]+/i)?.[0] || "";
  const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] || "";
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0] || "";
  const firstLine = text.split("\n").map(line => line.trim()).find(Boolean) || screenshotName || "unknown";
  return { link, email, phone, firstLine };
}

export function reportTargets(signal, text = "") {
  const targets = ["ZAPP'EM shared blocklist"];
  if (signal.email || /gmail|google/i.test(text)) targets.push("Gmail phishing/spam report");
  if (signal.phone) targets.push("Carrier spam report via 7726");
  if (/apple|icloud/i.test(text)) targets.push("Apple phishing report");
  if (/facebook|messenger|meta/i.test(text)) targets.push("Facebook/Meta report");
  if (signal.link) targets.push("URL/domain abuse report");
  return [...new Set(targets)];
}

export function scanPayload({ text = "", screenshotName = "" }) {
  const hits = checks.filter(check => check.pattern.test(text));
  const screenshotBonus = screenshotName ? 12 : 0;
  const score = Math.min(100, hits.reduce((sum, check) => sum + check.weight, screenshotBonus));
  const signal = extractSignal(text, screenshotName);
  const normalized = normalizeText(`${signal.link} ${signal.email} ${signal.phone} ${text || screenshotName}`);
  const fingerprint = createHash("sha256").update(normalized || screenshotName || "unknown").digest("hex").slice(0, 16);
  const target = signal.link || signal.email || signal.phone || signal.firstLine;

  return {
    fingerprint,
    target,
    score,
    reasons: screenshotName ? ["Screenshot evidence attached", ...hits.map(hit => hit.label)] : hits.map(hit => hit.label),
    signal,
    reportTargets: reportTargets(signal, text)
  };
}
