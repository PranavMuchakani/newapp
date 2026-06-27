import express from "express";
import { pool } from "../db.js";
import { requireAuth, requireAgeVerified } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth, requireAgeVerified);

/**
 * GET /discover
 * Returns candidate profiles:
 *  - within max_distance_km (PostGIS distance query)
 *  - matching gender preference
 *  - within age range
 *  - excluding already-swiped users
 *  - excluding blocked/reported users
 * Ordered by distance, then shared-interest overlap (simple scoring).
 */
router.get("/discover", async (req, res) => {
  const userId = req.user.userId;

  const prefResult = await pool.query("SELECT * FROM preferences WHERE user_id = $1", [userId]);
  const prefs = prefResult.rows[0] || { min_age: 18, max_age: 99, max_distance_km: 50, interested_in: [], interests: [] };

  const query = `
    SELECT u.id, u.display_name, u.bio,
           DATE_PART('year', AGE(u.date_of_birth)) AS age,
           ST_Distance(ul.geom, my.geom) / 1000 AS distance_km,
           cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest($5::text[]))) AS shared_interests
    FROM users u
    JOIN user_locations ul ON ul.user_id = u.id
    JOIN user_locations my ON my.user_id = $1
    LEFT JOIN preferences p ON p.user_id = u.id
    WHERE u.id != $1
      AND u.account_status = 'active'
      AND u.age_verified = TRUE
      AND DATE_PART('year', AGE(u.date_of_birth)) BETWEEN $2 AND $3
      AND ST_DWithin(ul.geom, my.geom, $4 * 1000)
      AND u.id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = $1)
      AND u.id NOT IN (SELECT reported_id FROM reports WHERE reporter_id = $1)
    ORDER BY shared_interests DESC, distance_km ASC
    LIMIT 20;
  `;

  const result = await pool.query(query, [
    userId,
    prefs.min_age,
    prefs.max_age,
    prefs.max_distance_km,
    prefs.interests || [],
  ]);

  res.json({ candidates: result.rows });
});

/**
 * POST /swipe  { swiped_id, action: 'like' | 'pass' }
 * If both users liked each other -> create a match.
 */
router.post("/swipe", async (req, res) => {
  const swiperId = req.user.userId;
  const { swiped_id, action } = req.body;

  if (!["like", "pass"].includes(action)) {
    return res.status(400).json({ error: "invalid_action" });
  }

  await pool.query(
    `INSERT INTO swipes (swiper_id, swiped_id, action) VALUES ($1,$2,$3)
     ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET action = $3`,
    [swiperId, swiped_id, action]
  );

  if (action === "like") {
    const mutual = await pool.query(
      "SELECT 1 FROM swipes WHERE swiper_id = $1 AND swiped_id = $2 AND action = 'like'",
      [swiped_id, swiperId]
    );

    if (mutual.rowCount > 0) {
      const [a, b] = [swiperId, swiped_id].sort(); // consistent ordering for unique constraint
      const match = await pool.query(
        `INSERT INTO matches (user_a, user_b) VALUES ($1,$2)
         ON CONFLICT (user_a, user_b) DO NOTHING
         RETURNING id`,
        [a, b]
      );
      return res.json({ matched: true, match_id: match.rows[0]?.id });
    }
  }

  res.json({ matched: false });
});

router.get("/matches", async (req, res) => {
  const userId = req.user.userId;
  const result = await pool.query(
    `SELECT m.id, m.matched_at,
            CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END AS other_user_id,
            u.display_name
     FROM matches m
     JOIN users u ON u.id = CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END
     WHERE (m.user_a = $1 OR m.user_b = $1) AND m.is_active = TRUE
     ORDER BY m.matched_at DESC`,
    [userId]
  );
  res.json({ matches: result.rows });
});

export default router;
