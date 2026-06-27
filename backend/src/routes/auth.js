import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { pool } from "../db.js";

const router = express.Router();

// --- Validation: enforces 18+ at the schema level, not just trust ---
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/) // Indian mobile number format
    .required(),
  password: Joi.string().min(8).required(),
  display_name: Joi.string().min(2).max(50).required(),
  date_of_birth: Joi.date()
    .max(new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)) // must be 18+
    .required(),
  gender: Joi.string().valid("male", "female", "nonbinary", "other").required(),
});

router.post("/signup", async (req, res) => {
  const { error, value } = signupSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: "validation_failed",
      // Generic message if it's the age check, so we don't leak exact DOB logic to bots
      message: error.details[0].path.includes("date_of_birth")
        ? "You must be 18 or older to create an account."
        : error.details[0].message,
    });
  }

  const { email, phone, password, display_name, date_of_birth, gender } = value;
  const password_hash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, phone, password_hash, display_name, date_of_birth, gender)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, email, display_name, age_verified, is_verified`,
      [email, phone, password_hash, display_name, date_of_birth, gender]
    );

    const user = result.rows[0];

    // NOTE: account is NOT fully active until:
    //  1. OTP phone verification (separate route, call SMS provider e.g. MSG91/Twilio)
    //  2. Government-ID based age verification (separate route, e.g. DigiLocker/Signzy)
    // Matching/messaging features should be gated behind age_verified = true.

    res.status(201).json({
      message: "Account created. Please verify your phone number and complete ID verification before you can match with others.",
      user,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "already_exists", message: "Email or phone already registered." });
    }
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  if (user.account_status !== "active") {
    return res.status(403).json({ error: "account_" + user.account_status });
  }

  const token = jwt.sign(
    { userId: user.id, ageVerified: user.age_verified },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  await pool.query("UPDATE users SET last_active_at = now() WHERE id = $1", [user.id]);

  res.json({ token, user: { id: user.id, display_name: user.display_name, age_verified: user.age_verified } });
});

export default router;
