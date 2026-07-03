# ZAPP'EM Prototype

ZAPP'EM is a one-button scam defense app concept:

1. A scam reaches the user.
2. The user adds a screenshot, pasted text, sender, link, email, or phone number.
3. ZAPP'EM scans it and creates a scam fingerprint.
4. If the fingerprint is already known, the real app should quarantine it before the user sees it.
5. If it is new or uncertain, the user hits ZAP.
6. ZAP updates the user's blocklist, the shared community blocklist, and a report package.
7. The user gets the fun skull screen and Zapper Score points.

## Current Files

- `index.html`: clickable prototype with scan, screenshot upload, ZAP screen, scoreboard, and blocklist UI.
- `server.js`: v0.7 backend prototype using a local JSON database.
- `app.webmanifest`, `sw.js`, `icon.svg`: PWA files so the app can be installed to a phone Home Screen once hosted.
- `scam-engine.js`: reusable scam scoring, fingerprinting, and report-routing core.
- `test-engine.js`: quick proof that the same scam creates the same fingerprint.
- `test-flow.js`: quick proof that repeat ZAPs graduate a fingerprint into auto-block.
- `test-correction.js`: quick proof that a Not A Scam vote moves a fingerprint into review.
- `test-review-queue.js`: quick proof that review items sort by correction trust weight.
- `data/blocklist.json`: created automatically when the server runs.

## Run Locally

```bash
cd /workspace/zappem
npm start
```

Then open:

```text
http://localhost:4174
```

## What v0.6 Actually Does

- Saves each ZAP to `data/blocklist.json`.
- Groups matching scams by fingerprint.
- Tracks confirmations.
- Marks a scam `auto_block` when it is high confidence or confirmed more than once.
- Stores report targets such as Gmail, Apple, carrier `7726`, Meta, or domain abuse reporting when the message clues point that way.
- Keeps the report package focused on scam evidence, not the user's private life.
- Shows a Protection Decision panel:
  - Known scam means block/quarantine before the inbox.
  - New or changed scam means user hits ZAP to teach the shared blocklist.
- Shows a Review Queue for possible false positives.
- Adds trust-weighted correction signals so one correction does not blindly erase a global block.
- Adds a PWA shell for phone use once the app is hosted over HTTPS.
- Adds a health endpoint at `/api/health` for deployment checks.

## Deploy The First Hosted Version

See `DEPLOYMENT.md`.

Short version:

1. Host it as a Node web service.
2. Use `npm install` as the build command.
3. Use `npm start` as the start command.
4. Point `zappem.app` DNS to the host's exact records.
5. Open `https://zappem.app` on iPhone Safari and add it to the Home Screen.

This first hosted version is for private testing and evidence collection. Before public launch, move the shared blocklist out of `data/blocklist.json` and into a real database.

## Phone Use Path

First usable version should be screenshot-first:

1. Host this app on HTTPS.
2. Open it on iPhone Safari.
3. Tap Share.
4. Tap Add to Home Screen.
5. Use it like an app to upload scam screenshots, paste messages, hit ZAP, and build the shared database.

This does not require connecting Gmail or Messages yet. It will not auto-block those inboxes until platform integrations are added, but it lets real scam evidence start flowing into ZAPP'EM.

## Test The Engine

```bash
cd /workspace/zappem
node test-engine.js
node test-flow.js
node test-correction.js
node test-review-queue.js
```

Expected behavior:

- `sameFingerprint` is `true` for the same scam repeated twice.
- Scam score rises based on dangerous wording, fake payment/account claims, suspicious links, and screenshot evidence.
- Report targets are chosen from the evidence, such as Apple phishing or URL/domain abuse.
- Repeat confirmations graduate the scam fingerprint toward `auto_block`.
- False-positive corrections move the fingerprint into `review` instead of blindly blocking it forever.
- Review queue items sort by correction weight so the most important review work rises first.

## Real Product Rule

If the scam is already known and the user has protection enabled, it should not show up as “reported 17 times.”

It should be quarantined before the inbox and summarized later:

> ZAPP'EM blocked 3 scams today.

The ZAP button is for new, changed, or uncertain scams that slipped through.
