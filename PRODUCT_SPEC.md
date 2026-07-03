# ZAPP'EM Product Spec

## One-Line Pitch

ZAPP'EM is a privacy-first scam shield with a big satisfying ZAP button: users report scams once, the app blocks repeats for everyone, and clean evidence gets routed toward the services that can help shut the scam down.

## Core Promise

Known scams should not keep showing up.

If ZAPP'EM already knows the fingerprint and protection is enabled, the message should be quarantined before the user sees it. The user should get a quiet summary instead:

> ZAPP'EM blocked 3 scams today.

The ZAP button is for new, changed, or uncertain scams that slip through.

## MVP Features

1. Screenshot-first capture
   - User uploads, pastes, or shares a screenshot.
   - OCR reads sender, subject, visible links, message body, platform clues, and scam language.

2. Scam score
   - Scores the message based on pressure language, fake payment/account claims, suspicious links, impersonation, repeated letters, and known templates.

3. ZAP action
   - Saves a local block entry.
   - Sends a privacy-safe fingerprint to the shared blocklist.
   - Prepares a report package for the right upstream service.
   - Gives the user the flashy skull payoff.

4. Shared blocklist
   - One user's ZAP helps everyone else.
   - Confirmed/high-confidence fingerprints become auto-block patterns.
   - Similar future scams are quarantined or warned.

5. Zapper Score
   - Users earn points for catching scams.
   - Bonus for first-caught scams.
   - Bonus when other users confirm the same scam.
   - Leaderboards can be friends, local, state, country, and global.

6. Privacy-safe reporting
   - Store only what is needed to detect and report the scam.
   - Avoid collecting private user data.
   - Give users transparency and control over what gets submitted.

7. False-positive correction
   - User can mark something as "Not A Scam."
   - ZAPP'EM lowers confidence and sends the fingerprint to review.
   - It should not instantly trust one correction enough to unblock globally if the scam has strong evidence.
   - It should not let scammers mass-clear known scam fingerprints.

8. Review and trust layer
   - Corrections enter a review queue.
   - Trusted users can carry more correction weight over time.
   - New or untrusted users can still flag false positives, but cannot clear global blocks alone.
   - Repeated abuse of Not A Scam lowers trust.

## What We Store

- Scam fingerprint
- Suspicious link or domain
- Visible sender email or phone number
- Message pattern
- Scam category
- Screenshot hash or template fingerprint
- Confirmation count
- Report target routing

## What We Do Not Store

- User contacts
- Private inbox contents
- Personal account numbers
- Payment information
- Home addresses
- Full screenshots by default
- Anything not needed for scam detection or reporting

## Account And Permission Model

ZAPP'EM should connect accounts without becoming a data vacuum.

### Account Identity

- Let users create a ZAPP'EM account with Sign in with Apple, Google, or email.
- Prefer provider IDs, anonymous IDs, or private relay email addresses over storing real personal emails where possible.
- Store a ZAPP'EM user ID, Zapper Score, trust level, and opt-in settings.
- Do not use account login as permission to read private inboxes.

### Protection Permissions

Ask for each protection lane only when the user turns it on:

| Feature | Permission Style | Data Rule |
|---|---|---|
| Basic ZAP button | No mailbox connection | User submits screenshot/text manually |
| Gmail protection | OAuth with the narrowest usable Gmail scope | Process selected/flagged messages; store fingerprints, not inbox history |
| iPhone SMS filtering | Apple SMS filter extension | Classify unknown SMS/MMS; do not read contacts or iMessage |
| Browser protection | Browser extension permission for URLs | Check URLs against blocklist; store domain/fingerprint only |
| Business forms | Website form plugin/API key | Store source IP/domain/form fingerprint only when needed |

### Transparency Rules

- Show exactly what permission is being requested and why.
- Let the user disconnect any account.
- Let the user delete local submissions and account data.
- Keep full screenshots opt-in and temporary by default.
- Use the shared blocklist from fingerprints, not private user content.

## Reporting Targets

ZAPP'EM should prepare reports for the right place based on clues:

| Scam Clue | Report Target |
|---|---|
| Gmail or sender email | Gmail spam/phishing reporting |
| Apple/iCloud impersonation | Apple phishing reporting |
| Phone number or SMS | Carrier spam reporting, including 7726 where supported |
| Facebook/Messenger/Meta | Platform report flow |
| Suspicious link/domain | Domain host, registrar, or URL abuse reporting |
| Fraud/loss/crime | FTC/FBI IC3 user-assisted report package |

## Important Product Rule

ZAPP'EM should not blindly auto-file government/law-enforcement reports without user consent. It can prepare the package, prefill details, and route the user to the official reporting path. For direct integrations, only submit through official APIs or approved partner channels.

ZAPP'EM also should not blindly unblock a fingerprint because one user pressed "Not A Scam." Corrections should create a review state, lower confidence, and require enough trusted signals before global block rules change.

## Platform Integrations

### Phase 1: Web App

- Screenshot upload
- Text/link paste
- Scam score
- ZAP button
- Shared blocklist backend
- Scoreboard and report package
- PWA install path for phone Home Screen use
- Seed Mode using real scam screenshots from early users

### Phase 2: Gmail

- OAuth connection
- Scan selected messages
- Label/quarantine known scams
- Help user report spam/phishing through supported Gmail flows

### Phase 3: iPhone SMS Filtering

- SMS/MMS filter extension for unknown senders
- Local and server-assisted scam classification
- Quarantine known scams

### Phase 4: Browser Extension

- Warn before opening known scam links
- Block landing pages by domain/fingerprint
- Show "You Got Zapped" page for trap links controlled by ZAPP'EM

### Phase 5: Business Protection

- Website contact form protection
- Business Gmail monitoring
- Fake invoice and domain/trademark scam detection
- Admin dashboard with blocked attempts and report packages

## Tone And Brand

The app should feel serious under the hood and fun on the surface.

- Frontend tone: loud, satisfying, plain English.
- Security tone: calm, privacy-first, trustworthy.
- User payoff: "ZAPPED. TRY SOMEBODY ELSE."
- Brand fit: "Don't Expect Normal."

## Success Metric

The app wins when users say:

> My phone is quieter and my inbox is peaceful.

## First Real User Plan

Heath can be the first seed user because he receives frequent scam emails/texts/messages.

Phase 1 should collect only:

- Screenshot or pasted scam text he chooses to submit
- Scam fingerprint
- Visible sender/link/domain clues
- ZAP / Not A Scam decision
- Report targets

Phase 1 should not connect his Gmail or messages automatically yet. That comes after the privacy policy, OAuth review path, and user controls are ready.
