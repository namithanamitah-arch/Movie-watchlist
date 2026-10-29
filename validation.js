const ALLOWED_STATUSES = new Set(["planned", "watching", "watched"]);
const ALLOWED_FIELDS = new Set(["title", "director", "release_year", "genre", "status", "rating", "watched_date", "notes"]);

function validateMovie(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Request body must be a JSON object."] };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) errors.push("Movie title is required.");
  if (title.length > 120) errors.push("Movie title must be 120 characters or fewer.");

  const director = input.director == null ? "" : input.director;
  if (typeof director !== "string") errors.push("Director must be text.");
  else if (director.trim().length > 100) errors.push("Director must be 100 characters or fewer.");

  let releaseYear = input.release_year;
  if (releaseYear === "" || releaseYear === undefined) releaseYear = null;
  if (releaseYear !== null && (!Number.isInteger(Number(releaseYear)) || Number(releaseYear) < 1888 || Number(releaseYear) > 2100)) {
    errors.push("Release year must be a whole number between 1888 and 2100.");
  }

  const genre = input.genre == null ? "" : input.genre;
  if (typeof genre !== "string") errors.push("Genre must be text.");
  else if (genre.trim().length > 60) errors.push("Genre must be 60 characters or fewer.");

  const status = input.status || "planned";
  if (!ALLOWED_STATUSES.has(status)) errors.push("Status must be planned, watching, or watched.");

  let rating = input.rating;
  if (rating === "" || rating === undefined) rating = null;
  if (rating !== null && (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5)) {
    errors.push("Rating must be a whole number from 1 to 5.");
  }

  const watchedDate = input.watched_date || null;
  if (watchedDate !== null && (typeof watchedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(watchedDate) || Number.isNaN(Date.parse(`${watchedDate}T00:00:00Z`)))) {
    errors.push("Date watched must be a valid date in YYYY-MM-DD format.");
  }

  const notes = input.notes == null ? "" : input.notes;
  if (typeof notes !== "string") errors.push("Notes must be text.");
  else if (notes.length > 1000) errors.push("Notes must be 1000 characters or fewer.");

  const movie = {
    title,
    director: typeof director === "string" ? (director.trim() || null) : null,
    release_year: releaseYear === null ? null : Number(releaseYear),
    genre: typeof genre === "string" ? (genre.trim() || null) : null,
    status,
    rating: rating === null ? null : Number(rating),
    watched_date: watchedDate,
    notes: typeof notes === "string" ? (notes.trim() || null) : null
  };
  return { valid: errors.length === 0, errors, movie };
}

function hasUnknownFields(input) {
  return Object.keys(input || {}).filter((key) => !ALLOWED_FIELDS.has(key));
}

module.exports = { validateMovie, hasUnknownFields, ALLOWED_STATUSES };
