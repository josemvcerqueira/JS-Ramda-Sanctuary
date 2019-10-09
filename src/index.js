const apiKey = require("./apiKey");
const $ = require("jquery");
const userMoviesService = require("./userMoviesService");
const S = require("sanctuary");
const R = require("ramda");

const createFavoriteMovieTemplate = R.curry(function(ratingsOptions, movie) {
  return `<li><span>${movie.title}</span> 
    <select class="movie-rating" data-movie-id="${movie.id}">
      ${ratingsOptions(movie.rating)}
    </select> 
    <a href="#" class="remove-favorite" data-movie-id="${
      movie.id
    }">Remove</a></li>`;
});

function createMoviesElement(createElement, movies, createMovieTemplate) {
  return movies
    .filter(
      movie => movie.poster_path !== null && movie.poster_path !== undefined
    )
    .map(createMovieTemplate)
    .map(createElement);
}

const createElementFromData = R.curry(function(
  createElement,
  createTemplate,
  data
) {
  return createElement(createTemplate(data));
});

const createFavoriteMovieElement = createElementFromData(
  createElement,
  createFavoriteMovieTemplate(ratingsOptions)
);

const createMovieElement = createElementFromData(
  createElement,
  createMovieDetailsTemplte
);

const createMovieNotFoundElement = createElementFromData(
  createElement,
  createMovieNotFoundTemplate
);

function createElement(template) {
  const el = document.createElement("template");
  el.innerHTML = template;
  return el;
}

function clearElement(id) {
  document.getElementById(id).innerHTML = "";
}

function appendElementToParent(parent, el) {
  document.getElementById(parent).appendChild(el.content.firstElementChild);
}

function createGenresTemplate(genres) {
  return genres.map(genre => `<li>${genre.name}</li>`).join("");
}

function displayFavoriteMovies(
  favorites,
  appendElementToParent,
  createFavoriteMovieElement
) {
  clearElement("favorites");
  Object.keys(favorites)
    .map(movie => createFavoriteMovieElement(favorites[movie]))
    .forEach(el => appendElementToParent("favorites", el));
}

function displayMovieDetails(movie) {
  const el = createMovieElement(movie);
  addElementToBody({
    el,
    isElementOnPage,
    removeElement
  });
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
      ? createMoviesElement(
          createElement,
          response.results,
          createMovieTemplate
        )
      : [createMovieNotFoundElement({})];
  elements.forEach(el => appendElementToParent("foundMovies", el));
}

function createMovieDetailsTemplte(movie) {
  return `
    <div class="movie-detail" data-movie-id="${movie.id}">
      <p><strong>${movie.original_title}</strong></p>
      <img src="https://image.tmdb.org/t/p/w185${movie.poster_path}" />
      <p>
        <em>Genres:</em>
        <ul>
          ${createGenresTemplate(movie.genres)}
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

function createMovieNotFoundTemplate() {
  return `<strong>I'm sorry, we could not found the movie you were looking for<strong>`;
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

function ratingsOptions(r) {
  return [
    "<option>Rate this movie</option>",
    ...S.range(1)(11)
      .reverse()
      .map(i => `<option ${i == r ? "selected" : ""}>${i}</option>`)
  ];
}

$(document).on("click", ".movie img, .movie p", e => {
  e.preventDefault();
  const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${$(e.target)
    .closest(".movie")
    .data("movie-id")}?api_key=${apiKey}`;
  $.getJSON(movieDetailsUrl, response => {
    displayMovieDetails(response);
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
    userMoviesService.addFavorite(movieKey, title);
    displayFavoriteMovies(
      userMoviesService.loadSavedMovies(),
      appendElementToParent,
      createFavoriteMovieElement
    );
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
    appendElementToParent,
    createFavoriteMovieElement
  );
};
