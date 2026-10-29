const API_BASE = "/api/movies";

const state = { movies: [], query: "", status: "all", genre: "all", sort: "recent", deleteId: null, noticeTimer: null };
const el = (id) => document.getElementById(id);
const movieGrid = el("movie-grid");
const movieDialog = el("movie-dialog");
const confirmDialog = el("confirm-dialog");
const movieForm = el("movie-form");

document.addEventListener("DOMContentLoaded", () => {
  el("add-movie-button").addEventListener("click", () => openForm());
  el("empty-add-button").addEventListener("click", () => openForm());
  el("close-dialog").addEventListener("click", closeForm);
  el("cancel-dialog").addEventListener("click", closeForm);
  el("search").addEventListener("input", (event) => { state.query = event.target.value.trim().toLowerCase(); renderMovies(); });
  el("status-filter").addEventListener("change", (event) => { state.status = event.target.value; renderMovies(); });
  el("genre-filter").addEventListener("change", (event) => { state.genre = event.target.value; renderMovies(); });
  el("sort-by").addEventListener("change", (event) => { state.sort = event.target.value; renderMovies(); });
  movieForm.addEventListener("submit", saveMovie);
  el("keep-movie").addEventListener("click", () => confirmDialog.close());
  el("confirm-delete").addEventListener("click", deleteMovie);
  loadMovies();
});

async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw new Error("Could not reach the server. Make sure the backend is running and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

async function loadMovies() {
  movieGrid.innerHTML = '<div class="loading-state">Loading your movies…</div>';
  try {
    const data = await apiRequest(API_BASE);
    state.movies = data.movies || [];
    updateGenreFilter();
    updateStats();
    renderMovies();
  } catch (error) {
    movieGrid.innerHTML = "";
    showNotice(error.message, "error");
    el("results-caption").textContent = "Could not load movies";
    el("empty-title").textContent = "We couldn't load your collection.";
    el("empty-copy").textContent = "Check the server and Supabase configuration, then refresh the page.";
    el("empty-state").hidden = false;
  }
}

function updateStats() {
  el("total-count").textContent = state.movies.length;
  el("planned-count").textContent = state.movies.filter((movie) => movie.status === "planned").length;
  el("watched-count").textContent = state.movies.filter((movie) => movie.status === "watched").length;
  el("rated-count").textContent = state.movies.filter((movie) => movie.rating !== null && movie.rating !== undefined).length;
}

function updateGenreFilter() {
  const select = el("genre-filter");
  const current = state.genre;
  const genres = [...new Set(state.movies.map((movie) => movie.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.replaceChildren(new Option("All genres", "all"));
  genres.forEach((genre) => select.add(new Option(genre, genre)));
  select.value = genres.includes(current) ? current : "all";
  state.genre = select.value;
}

function getVisibleMovies() {
  const filtered = state.movies.filter((movie) => {
    const searchable = [movie.title, movie.director, movie.genre, movie.notes, movie.release_year].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(state.query)
      && (state.status === "all" || movie.status === state.status)
      && (state.genre === "all" || movie.genre === state.genre);
  });
  const sorted = [...filtered];
  if (state.sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === "year") sorted.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
  if (state.sort === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (state.sort === "recent") sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return sorted;
}

function renderMovies() {
  const movies = getVisibleMovies();
  el("results-caption").textContent = `${movies.length} ${movies.length === 1 ? "movie" : "movies"} shown`;
  movieGrid.replaceChildren();
  el("empty-state").hidden = movies.length !== 0;
  if (!movies.length) {
    const hasFilters = Boolean(state.query) || state.status !== "all" || state.genre !== "all";
    el("empty-title").textContent = state.movies.length && hasFilters ? "No movies match those filters." : "Your watchlist is a blank screen.";
    el("empty-copy").textContent = state.movies.length && hasFilters ? "Try changing your search or filters." : "Add a movie you want to watch and start building your collection.";
    el("empty-add-button").hidden = state.movies.length > 0;
    return;
  }
  movies.forEach((movie) => movieGrid.appendChild(createMovieCard(movie)));
}

function createMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";
  const poster = document.createElement("div");
  poster.className = "poster-placeholder";
  poster.setAttribute("aria-hidden", "true");
  const mark = document.createElement("span");
  mark.className = "poster-mark";
  mark.textContent = "▶";
  poster.appendChild(mark);
  const body = document.createElement("div");
  body.className = "card-body";

  const top = document.createElement("div");
  top.className = "card-top";
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "movie-title";
  title.textContent = movie.title;
  const meta = document.createElement("p");
  meta.className = "movie-meta";
  meta.textContent = [movie.release_year, movie.director ? `Directed by ${movie.director}` : ""].filter(Boolean).join(" · ") || "Release details not added";
  titleGroup.append(title, meta);
  const status = document.createElement("span");
  status.className = `status-pill status-${movie.status}`;
  status.textContent = statusLabel(movie.status);
  top.append(titleGroup, status);
  body.appendChild(top);

  if (movie.genre) {
    const genre = document.createElement("span");
    genre.className = "genre-tag";
    genre.textContent = movie.genre;
    body.appendChild(genre);
  }
  if (movie.rating) {
    const rating = document.createElement("div");
    rating.className = "movie-rating";
    rating.textContent = "★".repeat(movie.rating) + "☆".repeat(5 - movie.rating);
    const ratingLabel = document.createElement("span");
    ratingLabel.textContent = `${movie.rating}/5`;
    rating.appendChild(ratingLabel);
    body.appendChild(rating);
  }
  if (movie.notes) {
    const notes = document.createElement("p");
    notes.className = "movie-notes";
    notes.textContent = movie.notes;
    body.appendChild(notes);
  }
  const bottom = document.createElement("div");
  bottom.className = "card-bottom";
  const date = document.createElement("span");
  date.className = "watched-date";
  date.textContent = movie.watched_date ? `Watched ${formatDate(movie.watched_date)}` : "";
  const actions = document.createElement("div");
  actions.className = "card-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "small-action";
  edit.textContent = "Edit";
  edit.setAttribute("aria-label", `Edit ${movie.title}`);
  edit.addEventListener("click", () => openForm(movie));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "small-action delete";
  remove.textContent = "Remove";
  remove.setAttribute("aria-label", `Remove ${movie.title}`);
  remove.addEventListener("click", () => {
    state.deleteId = movie.id;
    confirmDialog.showModal();
  });
  actions.append(edit, remove);
  bottom.append(date, actions);
  body.appendChild(bottom);
  card.append(poster, body);
  return card;
}

function statusLabel(status) {
  return ({ planned: "Want to watch", watching: "Watching", watched: "Watched" })[status] || status;
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function openForm(movie = null) {
  movieForm.reset();
  el("movie-id").value = movie?.id || "";
  el("dialog-title").textContent = movie ? "Edit movie" : "Add a movie";
  el("save-button").textContent = movie ? "Save changes" : "Save movie";
  el("title-error").textContent = "";
  if (movie) {
    el("title").value = movie.title || "";
    el("director").value = movie.director || "";
    el("release-year").value = movie.release_year || "";
    el("genre").value = movie.genre || "";
    el("status").value = movie.status || "planned";
    el("rating").value = movie.rating ?? "";
    el("watched-date").value = movie.watched_date || "";
    el("notes").value = movie.notes || "";
  } else {
    el("status").value = "planned";
  }
  movieDialog.showModal();
  el("title").focus();
}

function closeForm() {
  movieDialog.close();
}

async function saveMovie(event) {
  event.preventDefault();
  const title = el("title").value.trim();
  if (!title) {
    el("title-error").textContent = "Please enter a movie title.";
    el("title").focus();
    return;
  }
  el("title-error").textContent = "";
  const id = el("movie-id").value;
  const rawRating = el("rating").value;
  const rawYear = el("release-year").value;
  const payload = {
    title,
    director: el("director").value.trim(),
    release_year: rawYear ? Number(rawYear) : null,
    genre: el("genre").value,
    status: el("status").value,
    rating: rawRating ? Number(rawRating) : null,
    watched_date: el("watched-date").value || null,
    notes: el("notes").value.trim()
  };
  const saveButton = el("save-button");
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  try {
    const data = await apiRequest(id ? `${API_BASE}/${encodeURIComponent(id)}` : API_BASE, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const savedMovie = data.movie;
    if (id) state.movies = state.movies.map((movie) => movie.id === id ? savedMovie : movie);
    else state.movies.unshift(savedMovie);
    updateGenreFilter();
    updateStats();
    renderMovies();
    closeForm();
    showNotice(id ? "Movie updated successfully." : "Movie added to your watchlist.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? "Save changes" : "Save movie";
  }
}

async function deleteMovie() {
  if (!state.deleteId) return;
  const button = el("confirm-delete");
  button.disabled = true;
  button.textContent = "Removing…";
  try {
    await apiRequest(`${API_BASE}/${encodeURIComponent(state.deleteId)}`, { method: "DELETE" });
    state.movies = state.movies.filter((movie) => movie.id !== state.deleteId);
    state.deleteId = null;
    confirmDialog.close();
    updateGenreFilter();
    updateStats();
    renderMovies();
    showNotice("Movie removed from your watchlist.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Remove movie";
  }
}

function showNotice(message, type = "success") {
  const notice = el("notice");
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;
  if (state.noticeTimer) clearTimeout(state.noticeTimer);
  state.noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
}
