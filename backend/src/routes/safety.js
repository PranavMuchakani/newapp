import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Any logged-in user can report another user (works even if not age-verified yet,
// since reporting underage/unsafe behavior should never be gated)
router.post("/report", requireAuth, async (req, res) => {
  const { reported_id, reason, details } = req.body;
  const validReasons = ["harassment", "fake_profile", "underage", "explicit_content", "scam", "other"];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({ error: "invalid_reason" });
  }

  await pool.query(
    `INSERT INTO reports (reporter_id, reported_id, reason, details) VALUES ($1,$2,$3,$4)`,
    [req.user.userId, reported_id, reason, details || null]
  );

  // Reports alleging underage users or explicit/non-consensual content should be
  // prioritized for immediate human review per IT Rules 2021 + POCSO obligations.
  if (reason === "underage" || reason === "explicit_content") {
    await pool.query(
      `UPDATE reports SET status = 'reviewing' WHERE reporter_id = $1 AND reported_id = $2 AND reason = $3`,
      [req.user.userId, reported_id, reason]
    );
  }

  res.json({ message: "Report submitted. Our safety team will review it." });
});

// Public grievance endpoint - no auth required, per IT Rules 2021 §3(2)
// which mandates a published grievance mechanism reachable by anyone, not just users.
router.post("/grievance", async (req, res) => {
  const { filed_by_email, category, description } = req.body;
  if (!filed_by_email || !category || !description) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const result = await pool.query(
    `INSERT INTO grievances (filed_by_email, category, description, acknowledged_at)
     VALUES ($1,$2,$3, now()) RETURNING id`,
    [filed_by_email, category, description]
  );

  // IT Rules 2021 requires acknowledgement within 24 hours and resolution within 15 days.
  // acknowledged_at is set immediately here; resolution must be tracked by your
  // Grievance Officer (named human, published on your site) within 15 days.

  res.json({
    message: "Grievance received and acknowledged. You will hear back within 15 days as required by the IT Rules, 2021.",
    grievance_id: result.rows[0].id,
  });
});

export default router;
