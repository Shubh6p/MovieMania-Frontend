// ------- Boot overlay & app setup ------- //
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const moviesContainer = document.getElementById('moviesContainer');
const paginationContainer = document.getElementById('pagination');
const categoryButtons = document.querySelectorAll('.category-btn');

// API base (local vs deployed)
const BASE_URL =
  location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://moviemania-backend-31wk.onrender.com';

const itemsPerPage = 20;
const maxVisiblePages = 6;
let currentPage = 1;
let allMovies = [];
let filteredMovies = [];

// Boot overlay refs
const overlay = document.getElementById('loadingOverlay');
const loaderMsgEl = document.getElementById('loaderMsg');
const retryBtn = document.getElementById('retryBtn');

const LOADER_MESSAGES = [
  "Connecting to server… 📡",
  "Warming up our engines… 🔥",
  "Fetching fresh movies for you… 🍿",
  "Polishing posters… 🎬",
  "Almost there… ✨",
];

let msgTimer = null;
function startOverlay() {
  if (!overlay) return;
  let i = 0;
  loaderMsgEl.textContent = LOADER_MESSAGES[i];
  clearInterval(msgTimer);
  msgTimer = setInterval(() => {
    i = (i + 1) % LOADER_MESSAGES.length;
    loaderMsgEl.textContent = LOADER_MESSAGES[i];
  }, 2500);
  overlay.classList.remove('fade-out');
}

function stopOverlay() {
  if (!overlay) return;
  clearInterval(msgTimer);
  overlay.classList.add('fade-out');
  setTimeout(() => overlay.remove(), 400);
}

function showRetry(msg) {
  if (!overlay) return;
  loaderMsgEl.textContent = msg;
  retryBtn.classList.remove('hidden');
}
retryBtn?.addEventListener('click', () => location.reload());

// Skeleton helpers
function showSkeletons(count = itemsPerPage) {
  if (!moviesContainer) return;
  moviesContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skel-thumb"></div>
      <div class="skel-title"></div>
      <div class="skel-lines">
        <span></span><span></span><span style="width:70%"></span>
      </div>
    `;
    moviesContainer.appendChild(card);
  }
}

// Wait until the first page of posters is loaded, then hide overlay.
function hideWhenImagesReady(container) {
  const imgs = container.querySelectorAll('img');
  if (!imgs.length) { stopOverlay(); return; }
  let loaded = 0;
  const done = () => { loaded++; if (loaded >= Math.min(imgs.length, itemsPerPage)) stopOverlay(); };
  imgs.forEach(img => (img.complete ? done() : img.addEventListener('load', done, { once: true })));
}

// ------- existing page checks ------- //
const isIndex = !!moviesContainer;
const isMoviePage = window.location.pathname.includes('/movie/');


if (isIndex) {
  startOverlay();
  showSkeletons(itemsPerPage);

  fetch(`${BASE_URL}/api/movies`, { cache: 'no-store' })
    .then(response => response.json())
    .then(data => {
      allMovies = data;

      const urlParams = new URLSearchParams(window.location.search);
      const initialCategory = urlParams.get('category');
      const filterParam = urlParams.get('filter');

      filteredMovies = allMovies.filter(movie => {
        const categories = Array.isArray(movie.category)
          ? movie.category.map(c => c.toLowerCase())
          : [movie.category?.toLowerCase()];
        const matchCategory = initialCategory ? categories.includes(initialCategory.toLowerCase()) : true;
        const matchFilter = filterParam ? categories.includes(filterParam.toLowerCase()) : true;
        return matchCategory && matchFilter;
      });

      displayMovies(filteredMovies);
      generatePagination(filteredMovies.length, itemsPerPage);
      hideWhenImagesReady(moviesContainer);
    })
    .catch(error => {
      console.error('Error loading movies:', error);
      showRetry("Server is waking up… tap Retry if it takes too long.");
    });

  // ... keep your categoryButtons listener exactly as before ...
  categoryButtons.forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      const category = button.getAttribute('data-category');
      filteredMovies = category === 'all'
        ? allMovies
        : allMovies.filter(movie => Array.isArray(movie.category)
              ? movie.category.includes(category)
              : movie.category === category);
      currentPage = 1;
      displayMovies(filteredMovies);
      generatePagination(filteredMovies.length, itemsPerPage);
      scrollToTop();
    });
  });

  function displayMovies(movies) {
    moviesContainer.innerHTML = '';
    movies.forEach(movie => {
      const posterUrl = movie.poster?.startsWith('http') ? movie.poster : '/images/' + movie.poster;
      const movieLink = document.createElement('a');
      movieLink.href = `/movie/?id=${movie._id}`;
      movieLink.innerHTML = `
        <div class="movie-card" data-title="${movie.title}" data-details="${movie.details || ''}">
          <img src="${posterUrl}" onerror="this.src='/images/default.jpg'" alt="${movie.title} poster">
          <h3>${movie.title}</h3>
          <p>${movie.details || ''}</p>
        </div>
      `;
      moviesContainer.appendChild(movieLink);
    });
    displayPage(currentPage, itemsPerPage);
  }


  function generatePagination(totalItems, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > maxVisiblePages) {
      if (currentPage <= maxVisiblePages) {
        endPage = maxVisiblePages;
      } else if (currentPage > totalPages - maxVisiblePages + 1) {
        startPage = totalPages - maxVisiblePages + 1;
      } else {
        startPage = currentPage - Math.floor(maxVisiblePages / 2);
        endPage = currentPage + Math.floor(maxVisiblePages / 2);
      }
    }

    const prevBtn = document.createElement('a');
    prevBtn.href = '#';
    prevBtn.textContent = 'Prev';
    prevBtn.classList.add('prev-button');
    if (currentPage === 1) {
      prevBtn.classList.add('disabled');
      prevBtn.style.pointerEvents = 'none';
    }
    paginationContainer.appendChild(prevBtn);
    prevBtn.addEventListener('click', e => {
      e.preventDefault();
      if (currentPage > 1) {
        currentPage--;
        displayPage(currentPage, itemsPerPage);
        generatePagination(filteredMovies.length, itemsPerPage);
        scrollToTop();
      }
    });

    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('a');
      pageButton.href = '#';
      pageButton.textContent = i;
      pageButton.classList.add('page-number');
      if (i === currentPage) pageButton.classList.add('active');
      paginationContainer.appendChild(pageButton);
      pageButton.addEventListener('click', e => {
        e.preventDefault();
        if (i !== currentPage) {
          currentPage = i;
          displayPage(currentPage, itemsPerPage);
          generatePagination(filteredMovies.length, itemsPerPage);
          scrollToTop();
        }
      });
    }

    const nextBtn = document.createElement('a');
    nextBtn.href = '#';
    nextBtn.textContent = 'Next';
    nextBtn.classList.add('next-button');
    if (currentPage === totalPages) {
      nextBtn.classList.add('disabled');
      nextBtn.style.pointerEvents = 'none';
    }
    paginationContainer.appendChild(nextBtn);
    nextBtn.addEventListener('click', e => {
      e.preventDefault();
      if (currentPage < totalPages) {
        currentPage++;
        displayPage(currentPage, itemsPerPage);
        generatePagination(filteredMovies.length, itemsPerPage);
        scrollToTop();
      }
    });
  }

  function displayPage(page, itemsPerPage) {
    const start = (page - 1) * itemsPerPage;
    const end = page * itemsPerPage;
    const items = Array.from(moviesContainer.children);
    items.forEach((item, index) => {
      item.style.display = index >= start && index < end ? 'block' : 'none';
    });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// In the movie page block:
if (isMoviePage) {
  startOverlay();

  const movieId = new URLSearchParams(window.location.search).get('id');

  fetch(`${BASE_URL}/api/movie`)
    .then(res => res.json())
    .then(movies => {
      const movie = movies.find(m => m.id === movieId);
      if (!movie) {
        document.body.innerHTML =
          '<h2 style="text-align:center; padding: 2rem; color: white;">Movie not found</h2>';
        stopOverlay();
        return;
      }

      document.title = `${movie.title} - MovieMania`;

      const posterUrl = movie.poster?.startsWith('http')
        ? movie.poster
        : '/images/' + movie.poster;

      const posterEl = document.getElementById('poster');
      posterEl.src = posterUrl;
      posterEl.onerror = () => (posterEl.src = '/images/default.jpg');
      posterEl.alt = `${movie.title} Poster`;

      document.getElementById('title').textContent = movie.title;
      document.getElementById('release').textContent = movie.releaseDate;
      document.getElementById('stars').textContent = movie.stars;
      document.getElementById('rating').textContent = movie.rating;
      document.getElementById('languages').textContent = movie.languages;
      document.getElementById('countries').textContent = movie.countries;
      document.getElementById('summary').textContent = movie.summary;
      document.getElementById('link480').href = movie.downloads['480p'];
      document.getElementById('link720').href = movie.downloads['720p'];
      document.getElementById('link1080').href = movie.downloads['1080p'];

      if (movie.trailer && document.getElementById('trailerEmbed')) {
        const trailerSrc = movie.trailer.includes('watch?v=')
          ? movie.trailer.replace('watch?v=', 'embed/')
          : movie.trailer;
        document.getElementById(
          'trailerEmbed'
        ).innerHTML = `
          <iframe width="100%" height="100%" src="${trailerSrc}" frameborder="0" allowfullscreen></iframe>
        `;
      }

      // hide overlay after poster loads
      if (posterEl.complete) {
        stopOverlay();
      } else {
        posterEl.addEventListener('load', stopOverlay, { once: true });
        posterEl.addEventListener('error', stopOverlay, { once: true });
      }
    })
    .catch(err => {
      console.error('Error loading movie data:', err);
      showRetry('Server is waking up… tap Retry if it takes too long.');
    });
}


if (searchInput && searchResults) {
  let allSearchableMovies = [];

  // fetch all movies for search suggestions
  fetch(`${BASE_URL}/api/movies`)
    .then(response => response.json())
    .then(data => {
      allSearchableMovies = data;
    })
    .catch(err => {
      console.error('Error loading movie data for search:', err);
      showRetry("Search data unavailable — please retry.");
    });

  // debounce helper
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // search input handler
  searchInput.addEventListener(
    'input',
    debounce(() => {
      const query = searchInput.value.toLowerCase().trim();
      searchResults.innerHTML = '';
      if (query.length === 0) return;

      const matching = allSearchableMovies.filter(
        movie =>
          movie.title.toLowerCase().includes(query) ||
          (movie.details && movie.details.toLowerCase().includes(query))
      );

      if (matching.length === 0) {
        searchResults.innerHTML =
          '<p class="no-results">No results found. Please check the name again. You can <a href="/contact/" style="color: #00f; text-decoration: underline;">contact us</a> for this movie if you can\'t find it here.</p>';
        return;
      }

      matching.forEach(movie => {
        const posterUrl = movie.poster?.startsWith('http')
          ? movie.poster
          : '/images/' + movie.poster;
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');
        resultItem.innerHTML = `
          <a href="/movie/?id=${movie._id}" class="result-link">
            <div class="result-poster">
              <img src="${posterUrl}" onerror="this.src='/images/default.jpg'" alt="${movie.title}">
            </div>
            <div class="result-details">
              <strong>${movie.title}</strong>
              <p>${movie.details || ''}</p>
            </div>
          </a>
        `;
        searchResults.appendChild(resultItem);
      });
    }, 300)
  );

  // handle clicks on results
  searchResults.addEventListener('click', e => {
    const target = e.target.closest('.result-link');
    if (target) {
      window.location.href = target.getAttribute('href');
    }
  });

  // close results when clicking outside
  document.addEventListener('click', function (event) {
    const isClickInsideSearch =
      searchInput.contains(event.target) || searchResults.contains(event.target);
    if (!isClickInsideSearch) {
      searchResults.innerHTML = '';
    }
  });
}

// dropdown menus (mobile support)
document.addEventListener('DOMContentLoaded', () => {
  const dropdowns = document.querySelectorAll('.dropdown');
  const isMobile = () => window.innerWidth <= 768;

  dropdowns.forEach(dropdown => {
    const link = dropdown.querySelector('a');
    link.addEventListener('click', e => {
      if (isMobile()) {
        e.preventDefault();
        dropdown.classList.toggle('active');
      }
    });
  });

  document.addEventListener('click', e => {
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  });
});
