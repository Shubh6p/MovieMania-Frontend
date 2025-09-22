const params = new URLSearchParams(window.location.search);
const seriesId = params.get("series");
const quality = params.get("quality") || "480p";

if (!seriesId) {
  document.getElementById("series-title").textContent = "Series ID Missing";
  document.getElementById("series-desc").textContent = "Please provide a valid series ID in the URL.";
} else {
  fetch(`https://moviemania-backend-31wk.onrender.com/api/series/${seriesId}`)
    .then(res => {
      if (!res.ok) throw new Error("Series not found");
      return res.json();
    })
    .then(series => {
      document.getElementById("series-title").textContent = `${series.title} [${quality}]`;
      document.getElementById("series-desc").textContent = series.description || "";

      const container = document.getElementById("episode-list");
      container.innerHTML = "";

      if (!series.seasons || series.seasons.length === 0) {
        container.innerHTML = `<p class="text-red-500 font-semibold">No seasons available</p>`;
        return;
      }

      series.seasons.forEach(season => {
        // Season wrapper
        const seasonDiv = document.createElement("div");
        seasonDiv.className = "mb-14 text-center";

        // Season heading
        const seasonTitle = document.createElement("h3");
        seasonTitle.textContent = `Season ${season.seasonNumber}`;
        seasonTitle.className =
          "text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-red-600 mb-8 drop-shadow-lg tracking-wide";
        seasonDiv.appendChild(seasonTitle);

        if (!season.episodes || season.episodes.length === 0) {
          const noEp = document.createElement("p");
          noEp.textContent = "No episodes";
          noEp.className = "text-gray-400 italic";
          seasonDiv.appendChild(noEp);
        } else {
          // Episodes container
          const epContainer = document.createElement("div");
          epContainer.className =
            "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8";

          season.episodes.forEach(ep => {
  const link = ep.downloads?.[quality];
  if (link) {
    const card = document.createElement("a");
    card.href = link;
    card.className =
      "relative group rounded-2xl overflow-hidden shadow-lg transform transition duration-500 hover:scale-105";

    // Thumbnail (if available)
    if (ep.thumbnail) {
      const thumb = document.createElement("img");
      thumb.src = ep.thumbnail;
      thumb.alt = `Episode ${ep.episodeNumber}`;
      thumb.className =
        "w-full h-40 object-cover rounded-2xl brightness-90 group-hover:brightness-75 transition";
      card.appendChild(thumb);
    } else {
      // Fallback background
      card.classList.add("bg-gradient-to-br", "from-[#1a1a1a]", "to-[#2a2a2a]", "p-6");
    }

    // Overlay glow border
    const glow = document.createElement("div");
    glow.className =
      "absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-red-500 group-hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-500";
    card.appendChild(glow);

    // Episode badge
    const badge = document.createElement("span");
    badge.textContent = `Ep ${ep.episodeNumber}`;
    badge.className =
      "absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow";
    card.appendChild(badge);

    // Play button overlay
    const playIcon = document.createElement("div");
    playIcon.innerHTML = "▶";
    playIcon.className =
      "absolute inset-0 flex items-center justify-center text-5xl text-red-500 opacity-0 group-hover:opacity-100 transition duration-500";
    card.appendChild(playIcon);

    // Info panel (on hover)
    const info = document.createElement("div");
    info.innerHTML = `<p class="text-sm font-semibold">Episode ${ep.episodeNumber}</p>
                      <p class="text-xs text-gray-300">${ep.title || ""}</p>`;
    info.className =
      "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white opacity-0 group-hover:opacity-100 transition duration-500";
    card.appendChild(info);

    epContainer.appendChild(card);
  }
});


          seasonDiv.appendChild(epContainer);
        }

        container.appendChild(seasonDiv);
      });
    })
    .catch(err => {
      console.error("Error loading series:", err);
      document.getElementById("series-title").textContent = "Series Not Found";
      document.getElementById("series-desc").textContent = "The requested series could not be loaded.";
    });
}
