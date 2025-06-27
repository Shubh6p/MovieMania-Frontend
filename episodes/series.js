const params = new URLSearchParams(window.location.search);
const seriesId = params.get("series"); // this is now treated as the actual ID
const quality = params.get("quality") || "480p";

if (!seriesId) {
  document.getElementById("series-title").textContent = "Series ID Missing";
  document.getElementById("series-desc").textContent = "Please provide a valid series ID in the URL.";
} else {
  fetch(`/api/series/${seriesId}`)
    .then(res => {
      if (!res.ok) throw new Error("Series not found");
      return res.json();
    })
    .then(series => {
      document.getElementById("series-title").textContent = `${series.title} [${quality}]`;
      document.getElementById("series-desc").textContent = series.description || '';

      const episodes = series.episodes?.[quality];
      const container = document.getElementById("episode-list");

      if (!episodes || episodes.length === 0) {
        container.innerHTML = `<p style="color:red;">No episodes available for ${quality}</p>`;
        return;
      }

      episodes.forEach(ep => {
        const link = document.createElement("a");
        link.href = ep.link;
        link.className = "episode-link";
        link.textContent = ep.title;
        container.appendChild(link);
      });
    })
    .catch(err => {
      console.error("Error loading series:", err);
      document.getElementById("series-title").textContent = "Series Not Found";
      document.getElementById("series-desc").textContent = "The requested series could not be loaded.";
    });
}
