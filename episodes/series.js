const params = new URLSearchParams(window.location.search);
const seriesKey = params.get("series");
const quality = params.get("quality") || "480p";

fetch("https://moviemania-backend-31wk.onrender.com/api/series")
  .then(res => res.json())
  .then(data => {
    const series = data[seriesKey];
    console.log("Loaded series keys:", Object.keys(data));
    console.log("Requested series key:", seriesKey);

    if (!series) throw new Error("Series not found");

    document.getElementById("series-title").textContent = `${series.title} [${quality}]`;
    document.getElementById("series-desc").textContent = series.description;

    const episodes = series.episodes[quality];
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
    document.getElementById("series-title").textContent = "Series Not Found";
    document.getElementById("series-desc").textContent = "The requested series could not be loaded.";
    console.error(err);
  });
