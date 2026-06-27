import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Filter from "bad-words";
import { pool } from "../db.js";

const filter = new Filter();

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || "*" },
  });

  // Auth handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!payload.ageVerified) return next(new Error("age_verification_required"));
      socket.user = payload;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.userId;
    socket.join(`user:${userId}`);

    socket.on("join_match", async (matchId) => {
      // verify user is part of this match before allowing join
      const check = await pool.query(
        "SELECT 1 FROM matches WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND is_active = TRUE",
        [matchId, userId]
      );
      if (check.rowCount === 0) return socket.emit("error", "not_authorized_for_match");
      socket.join(`match:${matchId}`);
    });

    socket.on("send_message", async ({ matchId, content }) => {
      if (!content || content.trim().length === 0) return;
      if (content.length > 2000) return socket.emit("error", "message_too_long");

      // basic profanity/abuse filter; flag for review rather than silently blocking,
      // so moderators can catch harassment/trafficking-language patterns
      const isFlagged = filter.isProfane(content);

      const result = await pool.query(
        `INSERT INTO messages (match_id, sender_id, content, is_flagged)
         VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
        [matchId, userId, content, isFlagged]
      );

      io.to(`match:${matchId}`).emit("new_message", {
        id: result.rows[0].id,
        matchId,
        senderId: userId,
        content,
        createdAt: result.rows[0].created_at,
      });

      if (isFlagged) {
        // surfaced to a moderation queue/admin dashboard (not built here, but
        // this is the hook point for that pipeline)
        await pool.query(
          `INSERT INTO audit_log (actor_id, action, metadata) VALUES ($1,'message_flagged',$2)`,
          [userId, JSON.stringify({ matchId, messageId: result.rows[0].id })]
        );
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}
