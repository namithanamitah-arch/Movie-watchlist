require("dotenv").config();
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { getSupabase } = require("./supabase");
const moviesRouter = require("./routes/movies");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(helmet({
  // The interface uses a Google Fonts stylesheet for optional typography.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", application: "movie-watchlist" });
});

app.get("/api/health/database", async (req, res) => {
  try {
    const { error } = await getSupabase().from("movies").select("id", { head: true, count: "exact" });
    if (error) {
      console.error("Database health check failed:", error.message);
      return res.status(503).json({ status: "error", message: "Database connection failed. Check your Supabase schema and credentials." });
    }
    return res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    return res.status(503).json({ status: "error", message: "Database connection is not configured." });
  }
});

app.use("/api/movies", moviesRouter);

app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.get("/{*path}", (req, res, next) => {
  // Return the app for normal browser navigation, but do not hide missing asset errors.
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  console.error("Unhandled server error:", err?.message || err);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Movie Watchlist running at http://localhost:${PORT}`));
}

module.exports = app;
