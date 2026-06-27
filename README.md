# Connect — Starter Platform (India)

A starter codebase for a location-based matching/dating platform with India-specific
regulatory scaffolding baked in. **This is a foundation, not a finished, launch-ready
product** — see "Before you launch" below.

## Architecture

```
┌─────────────┐      HTTPS/WSS      ┌──────────────┐      SQL       ┌────────────┐
│  Frontend   │ ◄─────────────────► │   Backend    │ ◄────────────► │  Postgres  │
│  (React)    │                     │ (Express +   │                │ + PostGIS  │
│             │                     │  Socket.io)  │                │            │
└─────────────┘                     └──────────────┘                └────────────┘
                                            │
                                            ▼
                                  ┌───────────────────┐
                                  │ 3rd-party services │
                                  │ - SMS OTP          │
                                  │ - Age/ID verify    │
                                  │ - Photo moderation │
                                  └───────────────────┘
```

- **Auth**: JWT-based, bcrypt password hashing, age-gated at signup (DB-level CHECK constraint, not just app logic)
- **Matching**: PostGIS proximity query + preference filter + simple interest-overlap scoring (`backend/src/routes/matching.js`)
- **Messaging**: Socket.io rooms scoped per-match, with a basic profanity/flag filter that routes suspicious messages to a moderation queue rather than silently deleting them
- **Safety**: report + grievance endpoints mapped to India's IT Rules 2021 requirements

## What's NOT included (you must add before launch)

These are legally required gates, not optional polish:

1. **Real age/ID verification** — wire up DigiLocker, Signzy, or HyperVerge in `VerifyAge.jsx` + a backend callback that sets `age_verified = TRUE`
2. **CSAM hash-matching on photo upload** — wire up PhotoDNA, Hive, or AWS Rekognition before any photo goes live (`photos.moderation_status`)
3. **SMS OTP for phone verification** — MSG91 or Twilio
4. **A real lawyer's review of `docs/TOS_and_moderation_policy.md`**
5. **A named, contactable Grievance Officer** (mandatory under IT Rules 2021 — must be published on your live site)

## Free / cheap hosting plan (realistic, not "fully free")

True $0 hosting that also stays compliant doesn't exist for this use case — but this stays near-free at small scale:

| Layer | Service | Free tier |
|---|---|---|
| Backend | Render.com or Railway.app | Free web service tier (sleeps when idle) |
| Database | Supabase or Neon (Postgres + PostGIS) | Free tier, few GB |
| Frontend | Cloudflare Pages or Vercel | Free static hosting |
| Photo storage | Cloudflare R2 or Supabase Storage | Free tier (limited GB) |
| SMS OTP | MSG91 | Pay-per-SMS, no fixed cost — budget ~₹0.15–0.20/SMS |
| Age verification | Signzy/HyperVerge | Pay-per-verification, not free — budget this in, it's the one cost you genuinely cannot skip |

## Local setup

```bash
# Backend
cd backend
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
psql $DATABASE_URL -f ../docs/schema.sql
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Backend runs on :4000, frontend on :3000.

## Before you launch (checklist)

- [ ] Lawyer-reviewed ToS, Privacy Policy, Grievance mechanism live on the site
- [ ] CSAM hash-matching wired into photo upload pipeline
- [ ] Government-ID age verification wired in and enforced (not bypassable)
- [ ] Grievance Officer named and contact published
- [ ] DPDPA-compliant privacy policy + consent flows
- [ ] Moderation queue dashboard for flagged messages/reports (not built here — this starter only creates the data/hooks for it)
- [ ] Rate limiting and abuse monitoring tuned for production traffic
