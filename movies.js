const express = require("express");
const { getSupabase } = require("../supabase");
const { validateMovie, hasUnknownFields } = require("../utils/validation");

const router = express.Router();
const TABLE = "movies";

function handleDatabaseError(res, error, message = "A database operation failed.") {
  // Log server-side for the developer; do not return database internals to the browser.
  console.error(message, error?.message || error);
  return res.status(500).json({ error: message });
}

router.get("/", async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .select("id,title,director,release_year,genre,status,rating,watched_date,notes,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) return handleDatabaseError(res, error, "Could not load movies. Check your Supabase setup.");
    return res.json({ movies: data });
  } catch (error) {
    return handleDatabaseError(res, error, "Could not connect to the movie database.");
  }
});

router.post("/", async (req, res) => {
  const unknownFields = hasUnknownFields(req.body);
  if (unknownFields.length) return res.status(400).json({ error: `Unexpected field(s): ${unknownFields.join(", ")}.` });
  const result = validateMovie(req.body);
  if (!result.valid) return res.status(400).json({ error: result.errors.join(" "), details: result.errors });

  try {
    const { data, error } = await getSupabase().from(TABLE).insert(result.movie)
      .select("id,title,director,release_year,genre,status,rating,watched_date,notes,created_at,updated_at").single();
    if (error) return handleDatabaseError(res, error, "Could not save this movie.");
    return res.status(201).json({ movie: data });
  } catch (error) {
    return handleDatabaseError(res, error, "Could not connect to the movie database.");
  }
});

router.put("/:id", async (req, res) => {
  const unknownFields = hasUnknownFields(req.body);
  if (unknownFields.length) return res.status(400).json({ error: `Unexpected field(s): ${unknownFields.join(", ")}.` });
  const result = validateMovie(req.body);
  if (!result.valid) return res.status(400).json({ error: result.errors.join(" "), details: result.errors });

  try {
    const { data, error } = await getSupabase().from(TABLE).update(result.movie)
      .eq("id", req.params.id)
      .select("id,title,director,release_year,genre,status,rating,watched_date,notes,created_at,updated_at").maybeSingle();
    if (error) return handleDatabaseError(res, error, "Could not update this movie.");
    if (!data) return res.status(404).json({ error: "Movie not found." });
    return res.json({ movie: data });
  } catch (error) {
    return handleDatabaseError(res, error, "Could not connect to the movie database.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await getSupabase().from(TABLE).delete().eq("id", req.params.id)
      .select("id").maybeSingle();
    if (error) return handleDatabaseError(res, error, "Could not remove this movie.");
    if (!data) return res.status(404).json({ error: "Movie not found." });
    return res.json({ message: "Movie removed successfully." });
  } catch (error) {
    return handleDatabaseError(res, error, "Could not connect to the movie database.");
  }
});

module.exports = router;
