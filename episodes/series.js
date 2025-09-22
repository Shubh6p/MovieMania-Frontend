const params = new URLSearchParams(window.location.search);
const seriesId = params.get("series");  // series ID from URL: /episodes/?series=breaking-bad
const quality = params.get("quality") || "480p";

if (!seriesId) {
  document.getElementById("series-title").textContent = "Series ID Missing";
  document.getElementById("series-desc").textContent = "Please provide a valid series ID in the URL.";
} else {
  fetch(`http://localhost:3000/api/series/${seriesId}`)
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
        seasonDiv.className = "mb-10 text-center";

        // Season heading
        const seasonTitle = document.createElement("h3");
        seasonTitle.textContent = `Season ${season.seasonNumber}`;
        seasonTitle.className = "text-2xl font-bold text-red-500 mb-6";
        seasonDiv.appendChild(seasonTitle);

        if (!season.episodes || season.episodes.length === 0) {
          const noEp = document.createElement("p");
          noEp.textContent = "No episodes";
          noEp.className = "text-gray-400 italic";
          seasonDiv.appendChild(noEp);
        } else {
          // Episodes container
          const epContainer = document.createElement("div");
          epContainer.className = "flex flex-wrap justify-center gap-4";

          season.episodes.forEach(ep => {
            const link = ep.downloads?.[quality];
            if (link) {
              const epLink = document.createElement("a");
              epLink.href = link;
              epLink.textContent = `Episode ${ep.episodeNumber}`;
              epLink.className =
                "bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-white hover:text-red-600 border border-red-600 transition duration-300";
              epContainer.appendChild(epLink);
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
