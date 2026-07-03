# ZAPP'EM Deployment Notes

Domain purchased: `zappem.app`

This version is ready for a first hosted web app/PWA test. It is not the final production backend yet because it still stores the shared blocklist in a local JSON file. That is fine for demos and private testing, but public launch needs a real database such as Supabase, Neon, Firebase, or Postgres.

## What To Host First

Host the current app as a Node web service:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Node version: `20` or newer

Good simple hosts for this step:

- Render Web Service
- Railway
- Fly.io
- A small VPS

Vercel can host the frontend, but this exact backend is a plain Node server, so Render/Railway are the smoother first choice.

## Namecheap DNS

Do not buy extra Namecheap hosting, email, WordPress, or SSL for this prototype.

After the app is hosted, the host will give DNS records. Copy those exact records into Namecheap:

1. Open Namecheap.
2. Go to Domain List.
3. Tap Manage beside `zappem.app`.
4. Open Advanced DNS.
5. Add the records the host gives you.
6. Wait for DNS to update.

For most hosts this will include one record for `www` and one record for the root domain `@`. Use the host's exact instructions because apex/root records vary by host.

## Phone Install Path

Once `https://zappem.app` opens:

1. Open it in iPhone Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Use it like a phone app.

The PWA files are already included:

- `app.webmanifest`
- `sw.js`
- `icon.svg`

## What This Version Can Do

- Scan pasted scam text.
- Accept a scam screenshot upload.
- Score the scam.
- Create a repeatable scam fingerprint.
- Save ZAP events.
- Move repeat/high-confidence scams toward `auto_block`.
- Let a user mark something as Not A Scam.
- Keep a review queue for false positives.

## What Comes Next Before Public Launch

1. Replace local JSON storage with a real database.
2. Add user accounts or anonymous device IDs.
3. Add a privacy policy at `/privacy`.
4. Add a terms page at `/terms`.
5. Add an abuse/report export job for trusted report targets.
6. Add Gmail OAuth only after privacy and account handling are ready.
7. Add Apple SMS filtering later through a real iOS app extension.

## Important Reality Check

Screenshot mode helps collect scam evidence and build the blocklist. It cannot automatically block Gmail, iMessage, SMS, Facebook Messenger, or carrier messages by itself.

Automatic blocking requires platform-specific integrations:

- Gmail: OAuth + Gmail API.
- SMS on iPhone: iOS SMS filtering extension.
- SMS on Android: Android messaging permissions/default SMS app rules.
- Messenger/social apps: usually limited or unavailable without platform partnerships.

So the right build order is:

1. Host screenshot-first PWA.
2. Collect real scam fingerprints.
3. Add private accounts and database.
4. Add Gmail protection.
5. Add native mobile protection.
