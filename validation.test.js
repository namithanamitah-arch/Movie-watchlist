const test = require("node:test");
const assert = require("node:assert/strict");
const { validateMovie, hasUnknownFields } = require("./validation");

test("accepts a valid movie and normalizes optional blank fields", () => {
  const result = validateMovie({ title: "  Arrival  ", status: "watched", rating: "5", release_year: "2016", director: "", genre: "", notes: "" });
  assert.equal(result.valid, true);
  assert.equal(result.movie.title, "Arrival");
  assert.equal(result.movie.rating, 5);
  assert.equal(result.movie.release_year, 2016);
  assert.equal(result.movie.director, null);
});

test("rejects a missing title", () => {
  const result = validateMovie({ title: " " });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("title is required")));
});

test("rejects invalid status, year, and rating", () => {
  const result = validateMovie({ title: "Test", status: "archived", release_year: 1800, rating: 8 });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);
});

test("rejects a title that exceeds its maximum length", () => {
  const result = validateMovie({ title: "x".repeat(121) });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("120 characters")));
});

test("detects unexpected input fields", () => {
  assert.deepEqual(hasUnknownFields({ title: "Test", is_admin: true }), ["is_admin"]);
});
