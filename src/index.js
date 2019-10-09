const apiKey = require("./apiKey");
const $ = require("jquery");
const userMoviesService = require("./userMoviesService");

function clearElement(id) {
  document.getElementById(id).innerHTML = "";
}

function appendElementToParent(parent, el) {
  document.getElementById(parent).appendChild(el.content.firstElementChild);
}

function createMoviesElement({ movies, createMovieTemplate, createElement }) {
  return movies
    .filter(
      movie => movie.poster_path !== null && movie.poster_path !== undefined
    )
    .map(createMovieTemplate)
    .map(createElement);
}

function createMovieTemplate(movie) {
  return `
          <div class="movie" data-movie-id="${movie.id}">
            <p><strong>${movie.original_title}</strong></p>
            <img src="https://image.tmdb.org/t/p/w185${movie.poster_path}" />
            <p>
              <em>Year</em>: ${movie.release_date.substring(0, 4)}
            </p>
          </div>
        `;
}

function createMoviesNotFoundElement(createElement) {
  const template = `<strong>I'm sorry, we could not found the movie you were looking for<strong>`;
  return createElement(template);
}

function processSearchResponse({
  response,
  clearElement,
  createElement,
  appendElementToParent
}) {
  clearElement("foundMovies");
  const elements =
    response.total_results > 0
      ? createMoviesElement({
          movies: response.results,
          results: response.total_results,
          createMovieTemplate,
          createElement
        })
      : [createMoviesNotFoundElement(createElement)];
  elements.forEach(el => appendElementToParent("foundMovies", el));
}

function createMovieDetailsResponse(movie) {
  return `
    <div class="movie-detail" data-movie-id="${movie.id}">
      <p><strong>${movie.original_title}</strong></p>
      <img src="https://image.tmdb.org/t/p/w185${movie.poster_path}" />
      <p>
        <em>Genres:</em>
        <ul>
          ${displayGenres(movie.id, movie.genres)}
        </ul>
      </p>
      <p>
        <em>Year</em>: ${movie.release_date.substring(0, 4)}
      </p>
      <p>
        <em>Rating:</em> ${movie.vote_average}
      </p>
      <p>
        <button class="btn-close">Close</button> 
        <button class="btn-favorite" data-movie-title="${
          movie.title
        }" data-movie-id="${movie.id}">Add to favorites</button>
      </p>
    </div>
  `;
}

function createMovieElement({
  createElement,
  createMovieDetailsResponse,
  movie
}) {
  const movieDetailTemplate = createMovieDetailsResponse(movie);

  return createElement(movieDetailTemplate);
}

function createElement(template) {
  const el = document.createElement("template");
  el.innerHTML = template;
  return el;
}

function addElementToBody({ el, isElementOnPage, removeElement }) {
  if (isElementOnPage("movie-detail")) {
    removeElement("className");
  }
  document.body.appendChild(el.content.firstElementChild);
  $(".movie-detail").animate(
    {
      opacity: 1
    },
    300
  );
}

function isElementOnPage(className) {
  return document.getElementsByClassName(className).length > 0;
}

function removeElement(className) {
  document.getElementsByClassName(className)[0].remove();
}

// function isDetailsBeingDisplayed() {
//   return ;
// }

function displayGenres(genres) {
  return genres.map(genre => `<li>${genre.name}</li>`).join("");
}

function ratingsOptions(r) {
  let ratings = "<option>Rate this movie</option>";
  for (let i = 10; i > 0; i--) {
    ratings += `<option ${i == r ? "selected" : ""}>${i}</option>`;
  }
  return ratings;
}

function displayFavoriteMovies(
  favorites,
  createElement,
  ratingsOptions,
  appendElementToParent,
  createFavoriteMovieElement
) {
  document.getElementById("favorites").innerHTML = "";
  Object.keys(favorites)
    .map(movieId =>
      createFavoriteMovieElement(createElement, ratingsOptions, movieId)
    )
    .forEach(el => appendElementToParent("favorites", el));
}

function createFavoriteMovieElement(createElement, ratingsOptions, movieId) {
  return createElement(
    `<li><span>${
      userMoviesService.loadSavedMovies()[movieId].title
    }</span> <select class="movie-rating" data-movie-id="${movieId}">${ratingsOptions(
      userMoviesService.loadSavedMovies()[movieId].rating
    )}</select> <a href="#" class="remove-favorite" data-movie-id="${movieId}">Remove</a></li>`
  );
}

$(document).on("click", ".movie img, .movie p", e => {
  e.preventDefault();
  const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${$(e.target)
    .closest(".movie")
    .data("movie-id")}?api_key=${apiKey}`;
  $.getJSON(movieDetailsUrl, response => {
    const el = createMovieElement({
      createMovieDetailsResponse,
      movie: response,
      createElement
    });
    addElementToBody({
      el,
      isElementOnPage,
      removeElement
    });
  });
});

$(document).on("click", "button[type=submit]", e => {
  e.preventDefault();
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${$(
    "#search"
  ).val()}`;
  $.getJSON(url, response => {
    processSearchResponse({
      response,
      clearElement,
      createElement,
      appendElementToParent
    });
  });
});

$(document).on("click", ".btn-close", function() {
  $(this)
    .closest("div")
    .animate({ opacity: 0 }, 300, function() {
      $(this).remove();
    });
});

$(document).on("click", ".btn-favorite", function() {
  const movieKey = $(this).data("movie-id");
  if (!userMoviesService.loadSavedMovies()[movieKey]) {
    const title = $(this).data("movie-title");
    userMoviesService.loadSavedMovies()[movieKey] = { title };
    userMoviesService.addFavorite(movieKey, title);
    displayFavoriteMovies();
  }
  $(this)
    .closest("div")
    .animate({ opacity: 0 }, 300, function() {
      $(this).remove();
    });
});

$(document).on("click", ".remove-favorite", function(e) {
  e.preventDefault();
  const movieId = $(this).data("movie-id");
  delete userMoviesService.loadSavedMovies()[movieId];
  userMoviesService.removeFavorite(movieId);
  displayFavoriteMovies(
    userMoviesService.loadSavedMovies(),
    createElement,
    ratingsOptions,
    appendElementToParent,
    createFavoriteMovieElement
  );
});

$(document).on("change", ".movie-rating", function() {
  const movieId = $(this).data("movie-id");
  var rating = $(this).val();
  userMoviesService.rateMovie(movieId, rating);
});

window.onload = function() {
  displayFavoriteMovies(
    userMoviesService.loadSavedMovies(),
    createElement,
    ratingsOptions,
    appendElementToParent,
    createFavoriteMovieElement
  );
};
