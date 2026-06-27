-- ===================================================================
-- Schema: dating/matching platform
-- DB: PostgreSQL (works on free tiers: Supabase, Neon, Railway)
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for geolocation distance queries

-- ---------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20) UNIQUE,            -- India: required for OTP verification
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(50) NOT NULL,
    date_of_birth   DATE NOT NULL,                  -- used to enforce 18+ at signup
    gender          VARCHAR(20),
    bio             TEXT,
    is_verified     BOOLEAN DEFAULT FALSE,           -- phone/email verified
    age_verified    BOOLEAN DEFAULT FALSE,           -- govt-ID / 3rd-party age check passed
    id_verification_provider VARCHAR(50),            -- e.g. 'digilocker', 'signzy', 'manual'
    account_status  VARCHAR(20) DEFAULT 'active',    -- active, suspended, banned, deleted
    suspension_reason TEXT,
    last_active_at  TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT age_check CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

-- Location stored separately, updated frequently, indexed for proximity search
CREATE TABLE user_locations (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    geom        GEOGRAPHY(Point, 4326) NOT NULL,     -- lat/lon
    city        VARCHAR(100),
    state       VARCHAR(100),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_user_locations_geom ON user_locations USING GIST (geom);

-- ---------------------------------------------------------------
-- PHOTOS  (every upload must pass moderation before being visible)
-- ---------------------------------------------------------------
CREATE TABLE photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    is_primary      BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, flagged_csam
    moderation_notes TEXT,
    hash_sha256     VARCHAR(64),                     -- for PhotoDNA / hash-matching against known CSAM hash sets
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------
-- PREFERENCES (used by matching engine)
-- ---------------------------------------------------------------
CREATE TABLE preferences (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    interested_in   VARCHAR(20)[],     -- e.g. {'male','female','nonbinary'}
    min_age         INT DEFAULT 18,
    max_age         INT DEFAULT 99,
    max_distance_km INT DEFAULT 50,
    interests       VARCHAR(50)[]      -- tags used for compatibility scoring
);

-- ---------------------------------------------------------------
-- SWIPES / LIKES -> MATCH when mutual
-- ---------------------------------------------------------------
CREATE TABLE swipes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swiper_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    swiped_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    action          VARCHAR(10) NOT NULL,  -- 'like' or 'pass'
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(swiper_id, swiped_id)
);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id, action);

CREATE TABLE matches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a          UUID REFERENCES users(id) ON DELETE CASCADE,
    user_b          UUID REFERENCES users(id) ON DELETE CASCADE,
    matched_at      TIMESTAMPTZ DEFAULT now(),
    is_active       BOOLEAN DEFAULT TRUE,    -- false if either user unmatches
    UNIQUE(user_a, user_b)
);

-- ---------------------------------------------------------------
-- MESSAGING
-- ---------------------------------------------------------------
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id        UUID REFERENCES matches(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id),
    content         TEXT NOT NULL,
    is_flagged      BOOLEAN DEFAULT FALSE,    -- auto-flagged by keyword/ML filter
    created_at      TIMESTAMPTZ DEFAULT now(),
    read_at         TIMESTAMPTZ
);
CREATE INDEX idx_messages_match ON messages(match_id, created_at);

-- ---------------------------------------------------------------
-- REPORTS  (user safety - required for IT Rules 2021 grievance mechanism)
-- ---------------------------------------------------------------
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id     UUID REFERENCES users(id),
    reported_id     UUID REFERENCES users(id),
    reason          VARCHAR(50) NOT NULL,   -- harassment, fake_profile, underage, explicit_content, scam, other
    details         TEXT,
    status          VARCHAR(20) DEFAULT 'open', -- open, reviewing, resolved, escalated_legal
    resolved_by     UUID,                    -- admin/moderator user id
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- IT Rules 2021 requires a published Grievance Officer + resolution within 15 days,
-- and 24hr acknowledgement for complaints about sexually explicit / impersonation content.
CREATE TABLE grievances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filed_by_email  VARCHAR(255) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'open',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------
-- AUDIT LOG (for legal-compliance traceability)
-- ---------------------------------------------------------------
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id        UUID,
    action          VARCHAR(100) NOT NULL,
    target_id       UUID,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);
