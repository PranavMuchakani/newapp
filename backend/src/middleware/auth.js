import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "no_token" });

  try {
    const payload = jwt.verify(header.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

// Use this on any route that lets users see/contact other people:
// matching, browsing, messaging, profile photos of others.
export function requireAgeVerified(req, res, next) {
  if (!req.user.ageVerified) {
    return res.status(403).json({
      error: "age_verification_required",
      message: "Complete government-ID age verification to access this feature.",
    });
  }
  next();
}
