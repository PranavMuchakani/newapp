import express from "express";
import axios from "axios";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * DigiLocker Requester OAuth 2.0 flow (api.digitallocker.gov.in / API Setu).
 * This is the free, government-run alternative to paid resellers like
 * Surepass/Signzy. You get your client ID + secret from:
 *   https://partners.apisetu.gov.in  -> Consumer APIs -> Requester configuration
 *
 * Flow:
 *  1. Frontend sends user here: GET /auth/digilocker/start
 *  2. We redirect them to DigiLocker's OAuth consent screen
 *  3. User logs into DigiLocker, grants consent to share Aadhaar e-KYC
 *  4. DigiLocker redirects back to our callback with a `code`
 *  5. We exchange the code for an access token
 *  6. We use that token to fetch the user's e-Aadhaar XML/JSON (contains DOB)
 *  7. We compute age, set users.age_verified = true if 18+
 */

const DIGILOCKER_AUTH_URL = "https://api.digitallocker.gov.in/public/oauth2/1/authorize";
const DIGILOCKER_TOKEN_URL = "https://api.digitallocker.gov.in/public/oauth2/1/token";
const DIGILOCKER_EKYC_URL = "https://api.digitallocker.gov.in/public/oauth2/1/xml/eaadhaar"; // returns eAadhaar XML incl. DOB

// Step 1: kick off the OAuth redirect.
// requireAuth so we know which of our users this verification belongs to —
// we pass our internal userId through DigiLocker's `state` param and read it
// back on the callback, since DigiLocker itself doesn't know about our accounts.
router.get("/digilocker/start", requireAuth, (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.DIGILOCKER_CLIENT_ID,
    redirect_uri: process.env.DIGILOCKER_REDIRECT_URI, // e.g. https://your-backend.onrender.com/auth/digilocker/callback
    state: req.user.userId,
  });
  res.redirect(`${DIGILOCKER_AUTH_URL}?${params.toString()}`);
});

// Step 2: DigiLocker redirects back here after the user consents.
router.get("/digilocker/callback", async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/verify-age?status=failed`);
  }

  try {
    // Exchange authorization code for an access token
    const tokenResp = await axios.post(
      DIGILOCKER_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.DIGILOCKER_CLIENT_ID,
        client_secret: process.env.DIGILOCKER_CLIENT_SECRET,
        redirect_uri: process.env.DIGILOCKER_REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResp.data.access_token;

    // Fetch e-Aadhaar details (contains DOB) using the access token
    const ekycResp = await axios.get(DIGILOCKER_EKYC_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // NOTE: DigiLocker returns eAadhaar as signed XML. In production, parse
    // the XML (e.g. with `xml2js`) to extract the <Poi dob="DD-MM-YYYY" .../> field.
    // Field names/exact shape should be confirmed against the Swagger spec on
    // partners.apisetu.gov.in once you have sandbox access:
    const dobString = extractDobFromEAadhaarXml(ekycResp.data);
    const dob = parseDigiLockerDate(dobString);

    const age = calculateAge(dob);
    const isAdult = age >= 18;

    await pool.query(
      `UPDATE users
       SET age_verified = $1, id_verification_provider = 'digilocker', updated_at = now()
       WHERE id = $2`,
      [isAdult, userId]
    );

    await pool.query(
      `INSERT INTO audit_log (actor_id, action, metadata) VALUES ($1, 'age_verification_attempt', $2)`,
      [userId, JSON.stringify({ provider: "digilocker", result: isAdult ? "passed" : "failed_underage" })]
    );

    if (!isAdult) {
      // Underage attempt — ban immediately, don't just leave unverified.
      await pool.query(
        `UPDATE users SET account_status = 'banned', suspension_reason = 'failed_age_verification' WHERE id = $1`,
        [userId]
      );
      return res.redirect(`${process.env.FRONTEND_URL}/verify-age?status=underage`);
    }

    res.redirect(`${process.env.FRONTEND_URL}/discover?status=verified`);
  } catch (err) {
    console.error("DigiLocker verification error:", err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/verify-age?status=error`);
  }
});

function calculateAge(dob) {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

function parseDigiLockerDate(dobString) {
  // DigiLocker eAadhaar typically returns DOB as DD-MM-YYYY
  const [day, month, year] = dobString.split("-");
  return new Date(`${year}-${month}-${day}`);
}

function extractDobFromEAadhaarXml(xmlData) {
  // TODO: replace with real XML parsing (e.g. the `xml2js` package) once you
  // have sandbox access and can see the actual response shape from
  // DigiLocker's docs/Swagger spec. Left unimplemented on purpose so this
  // never silently reports a wrong age — wire this up before going live.
  throw new Error("extractDobFromEAadhaarXml not implemented — wire up real XML parsing once DigiLocker sandbox access is confirmed");
}

export default router;
