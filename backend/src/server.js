import express from "express";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import matchingRoutes from "./routes/matching.js";
import safetyRoutes from "./routes/safety.js";
import digilockerRoutes from "./routes/digilocker.js";
import { initSockets } from "./sockets/messaging.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// Rate limiting: protects against scraping/bot signups and brute-force login,
// both common abuse vectors on dating platforms.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "rate_limited" },
  })
);
app.use(
  "/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }) // tighter limit on login specifically
);

app.use("/auth", authRoutes);
app.use("/match", matchingRoutes);
app.use("/safety", safetyRoutes);
app.use("/auth", digilockerRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const httpServer = http.createServer(app);
initSockets(httpServer);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
