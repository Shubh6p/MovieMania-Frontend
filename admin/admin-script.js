// admin-script.js (MovieMania_Final-main/admin)
function authFetch(url, options = {}) {
  const token = sessionStorage.getItem("jwt_token");
  if (!options.headers) options.headers = {};
  options.headers.Authorization = `Bearer ${token}`;
  return fetch(url, options);
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function getAdminUsername() {
  return sessionStorage.getItem("admin_user") || "unknown";
}

function logout() {
  sessionStorage.removeItem("admin_auth");
  sessionStorage.removeItem("admin_user");
  window.location.href = "/admin/login.html";
}

function isAuthenticated() {
  if (!sessionStorage.getItem("admin_auth")) {
    window.location.href = "/admin/login.html";
  }
}

function restrictAccessByRole(role) {
  const allPanels = ["manageAdmins", "changePassword", "addMovie", "addSeries", "generateJSON", "sessionSection"];
  const editable = ["addMovie", "addSeries", "generateJSON"];

  if (role === "owner") return;

  if (role === "admin") {
    const manageEl = document.getElementById("manageAdmins");
    const changePass = document.getElementById("changePassword");
    const deleteMovie = document.getElementById("deleteMovie");
    const deleteSeries = document.getElementById("deleteSeries");

    if (manageEl) manageEl.innerHTML = "<p style='color: red;'>❌ You don’t have access to manage admins.</p>";
    if (changePass) changePass.innerHTML = "<p style='color: red;'>❌ You don’t have access to change password.</p>";
    if (deleteMovie) deleteMovie.innerHTML = "<p style='color: red;'>❌ You don’t have access to delete movies.</p>";
    if (deleteSeries) deleteSeries.innerHTML = "<p style='color: red;'>❌ You don’t have access to delete series.</p>";

    // Enable inputs for editable sections
    editable.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.querySelectorAll("input, textarea, button").forEach(e => e.disabled = false);
    });
  }

  if (role === "viewer") {
    const panelsToLock = [
      "manageAdmins", "addMovie", "addSeries", "generateJSON",
      "backupExport", "analyticsDashboard", "notifications",
      "changePassword", "deleteMovie", "deleteSeries"
    ];

    panelsToLock.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = "<p style='color: red;'>❌ You don’t have access to this panel.</p>";
      }
    });
  }
}

function loadMyProfile() {
  const username = sessionStorage.getItem("admin_user");
  if (!username) return;

  authFetch(`http://localhost:3000/api/profile?username=${username}`)

    .then(res => res.json())
    .then(profile => {
      document.getElementById("myProfileUsername").textContent = profile.username;
      document.getElementById("myProfileRole").textContent = profile.role;
      const formatDate = (dateStr) =>
      new Date(dateStr).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });

      document.getElementById("myProfileCreated").textContent = formatDate(profile.createdAt);

      const lastLoginTime = profile.lastLogin?.timestamp
      ? formatDate(profile.lastLogin.timestamp)
      : "N/A";
      document.getElementById("myProfileLastLogin").textContent = lastLoginTime;

      restrictAccessByRole(profile.role);
    });
}

function previewImage(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => preview.src = e.target.result;
    reader.readAsDataURL(file);
  }
}

function loadSessions() {
  const currentUser = sessionStorage.getItem("admin_user");
  const currentRole = document.getElementById("myProfileRole")?.textContent;

  authFetch("http://localhost:3000/api/sessions")
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById("sessionLogs");
      tbody.innerHTML = "";
      const filtered = currentRole === "owner" ? data : data.filter(s => s.username === currentUser);

      filtered.reverse().forEach(entry => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${entry.username}</td>
          <td>${entry.ip}</td>
          <td>${new Date(entry.timestamp).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
      });
    });
}

function loadAdmins() {
  authFetch("http://localhost:3000/api/admins")
    .then(res => res.json())
    .then(admins => {
      const tbody = document.getElementById("adminList");
      tbody.innerHTML = "";
      admins.forEach(admin => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><input value="${admin.username}" onchange="updateAdminField('${admin.username}', 'username', this.value)" /></td>
          <td><input value="${admin.role}" onchange="updateAdminField('${admin.username}', 'role', this.value)" /></td>
          <td>${new Date(admin.createdAt).toLocaleString()}</td>
          <td><button onclick="deleteAdmin('${admin.username}')">Delete</button></td>
        `;
        tbody.appendChild(row);
      });
    });
}

function addAdmin() {
  const username = val("newAdminUsername");
  const password = val("newAdminPassword");
  const role = val("newAdminRole") || "admin";
  if (!username || !password) return alert("Username and password required");

  authFetch("http://localhost:3000/api/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Admin added successfully");
        document.getElementById("newAdminUsername").value = "";
        document.getElementById("newAdminPassword").value = "";
        document.getElementById("newAdminRole").value = "";
        loadAdmins();
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    });
}

function deleteAdmin(username) {
  const currentUser = sessionStorage.getItem("admin_user");
  if (username === currentUser) return alert("You cannot delete yourself.");
  if (!confirm(`Delete admin '${username}'?`)) return;

  authFetch(`http://localhost:3000/api/admins/${username}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
      if (data.success) loadAdmins();
      else alert("Error: " + (data.error || "Unknown"));
    });
}

function updateAdminField(originalUsername, field, value) {
  const body = {};
  if (field === "username") body.newUsername = value;
  else body[field] = value;

  authFetch(`http://localhost:3000/api/admins/${originalUsername}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) loadAdmins();
      else alert("Error: " + (data.error || "Unknown"));
    });
}


function changeAdminPassword() {
  const username = val("targetUsername");
  const password = val("newPassword");
  if (!username || !password) return alert("Both fields required");

  authFetch(`http://localhost:3000/api/admins/${username}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) alert("Password updated");
      else alert("Error: " + (data.error || "Unknown"));
    });
}

let movieList = [];

function loadMoviesForEdit() {
  authFetch("http://localhost:3000/api/movies")
    .then(res => res.json())
    .then(data => {
      movieList = data;
      const select = document.getElementById("editMovieSelect");
      select.innerHTML = '<option disabled selected>Select a movie</option>';
      data.forEach(m => {
        const option = document.createElement("option");
        option.value = m.id;
        option.textContent = `${m.title} (${m.id})`;
        select.appendChild(option);
      });
    });
}

// Edit Posts

function loadMoviesForEdit() {
  authFetch("http://localhost:3000/api/movies")
    .then(res => res.json())
    .then(movies => {
      const select = document.getElementById("movieSelect");
      select.innerHTML = '<option value="">-- Select a Movie --</option>';
      movies.forEach(m => {
        const option = document.createElement("option");
        option.value = m.id;
        option.textContent = `${m.title} (${m.id})`;
        select.appendChild(option);
      });
    });
}

function searchMovie() {
  const query = document.getElementById("searchMovieInput").value.toLowerCase();
  const select = document.getElementById("movieSelect");
  const options = select.options;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (opt.value.toLowerCase().includes(query) || opt.textContent.toLowerCase().includes(query)) {
      select.selectedIndex = i;
      fetchMovieDetails();
      return;
    }
  }
  alert("Movie not found.");
}

function fetchMovieDetails() {
  const id = document.getElementById("movieSelect").value;
  if (!id) return;

  authFetch("http://localhost:3000/api/movies")
    .then(res => res.json())
    .then(movies => {
      const movie = movies.find(m => m.id === id);
      if (!movie) return alert("Movie not found.");

      document.getElementById("editTitle").value = movie.title || "";
      document.getElementById("editCategory").value = (movie.category || []).join(", ");
      document.getElementById("editDetails").value = movie.details || "";
      document.getElementById("editReleaseDate").value = movie.releaseDate || "";
      document.getElementById("editSummary").value = movie.summary || "";
      document.getElementById("editRating").value = movie.rating || "";
      document.getElementById("editLanguages").value = movie.languages || "";
      document.getElementById("editCountries").value = movie.countries || "";
      document.getElementById("editTrailer").value = movie.trailer || "";
      document.getElementById("editLink480").value = movie.downloads?.["480p"] || "";
      document.getElementById("editLink720").value = movie.downloads?.["720p"] || "";
      document.getElementById("editLink1080").value = movie.downloads?.["1080p"] || "";
      document.getElementById("editPosterPreview").src = movie.poster || "";
    });
}

function saveMovieEdits() {
  const id = document.getElementById("movieSelect").value;
  if (!id) return alert("Select a movie first");

  const updatedMovie = {
    title: document.getElementById("editTitle").value,
    category: document.getElementById("editCategory").value.split(",").map(c => c.trim()),
    details: document.getElementById("editDetails").value,
    releaseDate: document.getElementById("editReleaseDate").value,
    summary: document.getElementById("editSummary").value,
    rating: document.getElementById("editRating").value,
    languages: document.getElementById("editLanguages").value,
    countries: document.getElementById("editCountries").value,
    trailer: document.getElementById("editTrailer").value,
    downloads: {
      "480p": document.getElementById("editLink480").value,
      "720p": document.getElementById("editLink720").value,
      "1080p": document.getElementById("editLink1080").value,
    },
  };

  const file = document.getElementById("editPosterInput").files[0];
    if (file) {
      const formData = new FormData();
      formData.append("poster", file);
      authFetch("http://localhost:3000/upload-poster", {
        method: "POST",
        body: formData,
      })
        .then(res => res.text())
        .then(resp => {
          if (resp.startsWith("success:")) {
            const posterUrl = resp.replace("success:", "").trim();
            updatedMovie.poster = posterUrl;
            updatedMovie.image = posterUrl;
          }
          sendMovieUpdate(id, updatedMovie);
        });
    } else {
      sendMovieUpdate(id, updatedMovie);
    }

}

function sendMovieUpdate(id, data) {
  authFetch(`http://localhost:3000/updatemovie.html${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      clearEditForm(); // ✅ Add this line
    });
}
function clearEditForm() {
  document.getElementById("movieSelect").selectedIndex = 0;
  document.getElementById("editTitle").value = "";
  document.getElementById("editCategory").value = "";
  document.getElementById("editDetails").value = "";
  document.getElementById("editReleaseDate").value = "";
  document.getElementById("editSummary").value = "";
  document.getElementById("editRating").value = "";
  document.getElementById("editLanguages").value = "";
  document.getElementById("editCountries").value = "";
  document.getElementById("editTrailer").value = "";
  document.getElementById("editLink480").value = "";
  document.getElementById("editLink720").value = "";
  document.getElementById("editLink1080").value = "";
  document.getElementById("editPosterInput").value = "";
  document.getElementById("editPosterPreview").src = "";
}





// Delete Movies and Series
// Fetch Movies for Delete Option (with typing suggestions)
function loadMoviesForDelete() {
  authFetch("http://localhost:3000/api/movies")
    .then(res => res.json())
    .then(movies => {
      window.movieList = movies;  // Store the list of movies globally
      const movieSelect = document.getElementById("movieSelectDelete");
      movieSelect.innerHTML = '<option value="">-- Select a Movie --</option>';
      movies.forEach(movie => {
        const option = document.createElement("option");
        option.value = movie.id;
        option.textContent = `${movie.title} (${movie.id})`;
        movieSelect.appendChild(option);
      });
    });
}

// Fetch Series for Delete Option (with typing suggestions)
function loadSeriesForDelete() {
  authFetch("http://localhost:3000/api/series")
    .then(res => res.json())
    .then(series => {
      window.seriesList = series;  // Store the list of series globally
      const seriesSelect = document.getElementById("seriesSelectDelete");
      seriesSelect.innerHTML = '<option value="">-- Select a Series --</option>';
      series.forEach(serie => {
        const option = document.createElement("option");
        option.value = serie.id;
        option.textContent = `${serie.title} (${serie.id})`;
        seriesSelect.appendChild(option);
      });
    });
}

// Filter Movies based on search input
function filterMoviesForDelete() {
  const query = document.getElementById("searchMovieInput").value.toLowerCase();
  const filteredMovies = window.movieList.filter(movie =>
    movie.title.toLowerCase().startsWith(query)
  );
  
  const movieSelect = document.getElementById("movieSelectDelete");
  movieSelect.innerHTML = '<option value="">-- Select a Movie --</option>';
  filteredMovies.forEach(movie => {
    const option = document.createElement("option");
    option.value = movie.id;
    option.textContent = `${movie.title} (${movie.id})`;
    movieSelect.appendChild(option);
  });
}

// Filter Series based on search input
function filterSeriesForDelete() {
  const query = document.getElementById("searchSeriesInput").value.toLowerCase();
  const filteredSeries = window.seriesList.filter(serie =>
    serie.title.toLowerCase().startsWith(query)
  );
  
  const seriesSelect = document.getElementById("seriesSelectDelete");
  seriesSelect.innerHTML = '<option value="">-- Select a Series --</option>';
  filteredSeries.forEach(serie => {
    const option = document.createElement("option");
    option.value = serie.id;
    option.textContent = `${serie.title} (${serie.id})`;
    seriesSelect.appendChild(option);
  });
}

// Call the loadMoviesForDelete and loadSeriesForDelete functions when the page is loaded
document.addEventListener("DOMContentLoaded", () => {
  loadMoviesForDelete();
  loadSeriesForDelete();
});

// Delete Movie Function
function confirmDeleteMovie() {
  const movieId = document.getElementById("movieSelectDelete").value;
  if (!movieId) return alert("Please select a movie to delete.");

  if (confirm(`Are you sure you want to delete the movie with ID: '${movieId}'?`)) {
    authFetch(`http://localhost:3000/api/delete/movie`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: movieId, deletedBy: sessionStorage.getItem("admin_user") })
    })
      .then(res => res.json())
      .then(response => {
        if (response.success) {
          alert("Movie deleted successfully!");
          loadMoviesForDelete();  // Refresh the dropdown after deletion
        } else {
          alert("Failed to delete movie.");
        }
      });
  }
}

// Delete Series Function
function confirmDeleteSeries() {
  const seriesId = document.getElementById("seriesSelectDelete").value;
  if (!seriesId) return alert("Please select a series to delete.");

  if (confirm(`Are you sure you want to delete the series with ID: '${seriesId}'?`)) {
    authFetch(`http://localhost:3000/api/delete/series`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: seriesId, deletedBy: sessionStorage.getItem("admin_user") })
    })
      .then(res => res.json())
      .then(response => {
        if (response.success) {
          alert("Series deleted successfully!");
          loadSeriesForDelete();  // Refresh the dropdown after deletion
        } else {
          alert("Failed to delete series.");
        }
      });
  }
}


// Download files only with auth

function downloadFileWithAuth(type) {
  const token = sessionStorage.getItem("jwt_token");
  if (!token) return alert("❌ Not authenticated.");

  const url = `http://localhost:3000/api/backup/${type}?token=${token}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadWithAuth(url, filename) {
  const token = sessionStorage.getItem("jwt_token");
  if (!token) return alert("❌ Not authenticated.");

  const downloadUrl = `${url}?token=${token}`;
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}



function loadAnalytics() {
  authFetch("http://localhost:3000/api/stats")
    .then(res => res.json())
    .then(data => {
      document.getElementById("totalMovies").textContent = data.totalMovies;
      document.getElementById("totalSeries").textContent = data.totalSeries;
      document.getElementById("totalAdmins").textContent = data.totalAdmins;
      document.getElementById("recentLogins").textContent = data.recentLogins;
    });
}

function downloadBackupZip() {
  window.open("http://localhost:3000/api/backup/zip", "_blank");
}

function loadNotifications() {
  authFetch("http://localhost:3000/api/notifications")
    .then(res => res.json())
    .then((logs) => {
      const box = document.getElementById("notif_entries");
      box.innerHTML = "";

      logs.reverse().forEach((n) => {
        const time = new Date(n.timestamp).toLocaleString();
        const item = document.createElement("div");
        item.className = "notification-item";
        item.innerHTML = `
          <div class="notif-row">
            <div class="notif-text">[${time}] ${n.message}</div>
            <input type="checkbox" class="notif-checkbox" data-timestamp="${n.timestamp}" />
          </div>
        `;
        box.appendChild(item);
      });

      if (logs.length > 0) {
        sessionStorage.setItem("lastSeenNotification", logs[logs.length - 1].timestamp);
        updateNotificationDot();
      }
    });
}


function toggleAllNotifications(checkbox) {
  const checkboxes = document.querySelectorAll(".notif-checkbox");
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

function deleteSelectedNotifications() {
  const checkboxes = document.querySelectorAll(".notif-checkbox:checked");
  if (checkboxes.length === 0) return alert("❌ No notifications selected.");

  const timestampsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.dataset.timestamp));

  authFetch("http://localhost:3000/api/notifications/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indexes: timestampsToDelete })
  })
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      loadNotifications(); // Refresh UI after deletion
    });
}


function updateNotificationDot() {
  fetch("http://localhost:3000/api/notifications")
    .then(res => res.json())
    .then(logs => {
      const dot = document.getElementById("notif-dot");
      const lastSeen = sessionStorage.getItem("lastSeenNotification");

      const newLogs = logs.filter(log => !lastSeen || new Date(log.timestamp) > new Date(lastSeen));
      dot.style.display = newLogs.length > 0 ? "inline-block" : "none";
    });
}


function saveToServer() {
  const file = document.getElementById("posterInput").files[0];
  if (!file) return alert("Please select a poster image.");

  const token = sessionStorage.getItem("jwt_token");
  const formData = new FormData();
  formData.append("poster", file);

  // Use regular fetch() with Authorization header manually
  fetch("http://localhost:3000/upload-poster", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}` // 👈 required!
    },
    body: formData,
  })
    .then((res) => res.text())
    .then((response) => {
      if (response.startsWith("success:")) {
      const uploadedPosterPath = response.replace('success:', '').trim();


        const movie = {
          addedBy: getAdminUsername(),
          id: val("id"),
          title: val("title"),
          category: val("category").split(",").map(c => c.trim()),
          details: val("details"),
          image: uploadedPosterPath,
          url: `movie.html?id=${val("id")}`,
          releaseDate: val("releaseDate"),
          summary: val("summary"),
          rating: val("rating"),
          languages: val("languages"),
          countries: val("countries"),
          poster: uploadedPosterPath,
          trailer: val("trailer"),
          downloads: {
            "480p": val("link480"),
            "720p": val("link720"),
            "1080p": val("link1080"),
          },
        };

        // Save movie using authFetch (JSON-based call)
        authFetch("http://localhost:3000/api/movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(movie, null, 2),
        })
          .then((res) => res.json())
          .then((data) => {
            document.getElementById("output").textContent = JSON.stringify(data, null, 2);
            alert("✅ Movie added successfully!");


            // ✅ Clear form inputs
            const fieldsToClear = [
              "id", "title", "category", "details", "releaseDate", "summary",
              "rating", "languages", "countries", "trailer", "link480", "link720", "link1080"
            ];
            fieldsToClear.forEach(id => document.getElementById(id).value = "");

            // ✅ Clear poster input and preview
            document.getElementById("posterInput").value = "";
            document.getElementById("posterPreview").src = "";
          });

      } else {
        alert("❌ Poster upload failed.\n\nResponse:\n" + response.toString());
      }
    })
    .catch((err) => {
      alert("❌ Upload error: " + err.message);
    });
}


function generateSeriesJSON() {
  const id = val("seriesId");
  const title = val("seriesTitle");
  const description = val("description");
  const episodeCountRaw = val("episodeCount");
  const episodeCount = parseInt(episodeCountRaw, 10);
  const qualities = val("qualities").split(",").map((q) => q.trim());
  const pattern = val("linkPattern");

  if (!id) return alert("❌ Series ID is missing.");
  if (!title) return alert("❌ Title is missing.");
  if (isNaN(episodeCount)) return alert("❌ Total episodes must be a number.");

  const result = {
    [id]: {
      title,
      description,
      episodes: {
        "480p": [],
        "720p": [],
        "1080p": []
      }
    }
  };

  qualities.forEach((quality) => {
    for (let i = 1; i <= episodeCount; i++) {
      const link = pattern.replace("{id}", id).replace("{num}", i).replace("{quality}", quality);
      result[id].episodes[quality].push({ title: `Episode ${i}`, link });
    }
  });

  document.getElementById("output").textContent = JSON.stringify(result, null, 2);
}



function saveSeriesToServer() {
  const jsonText = document.getElementById("output").textContent;
  if (!jsonText) return alert("Please generate JSON first.");

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return alert("Invalid JSON");
  }

  const seriesKey = Object.keys(data)[0];
  const seriesData = data[seriesKey];

  // Build the flat object MongoDB expects
  const payload = {
  [seriesKey]: {
    title: seriesData.title,
    description: seriesData.description,
    episodes: seriesData.episodes,
    addedBy: getAdminUsername()
  }
};

console.log("Payload:", payload);

  authFetch("http://localhost:3000/api/series", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.error) {
        alert("❌ Error: " + res.error);
      } else {
        alert("✅ Series saved successfully.");
        // Optional: clear form
        document.getElementById("seriesId").value = "";
        document.getElementById("seriesTitle").value = "";
        document.getElementById("episodeCount").value = "";
        document.getElementById("description").value = "";
        document.getElementById("output").textContent = "";
      }
    })
    .catch((err) => {
      console.error("❌ Save error:", err);
      alert("❌ Failed to save series.");
    });
}


function mergeAndFormatJSON() {
  const input = val("input");
  let json;
  try {
    if (input.startsWith("{")) {
      json = JSON.parse(`{${input.replace(/^[{]|[}]$/g, "")}}`);
    } else if (input.startsWith("[")) {
      json = Object.assign({}, ...JSON.parse(input));
    } else {
      json = JSON.parse(`{${input}}`);
    }
    document.getElementById("output").textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    document.getElementById("output").textContent = " Invalid JSON input.\n" + e.message;
  }
}

// Panel navigation
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = link.dataset.panel;
      showPanel(target);
    });
  });
});

// Login function for MovieMania-Frontend /admin/login.html
function login() {
  const username = val("username");
  const password = val("password");

  console.log("Attempting login with:", username, password);

  fetch("http://localhost:3000/api/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
})
  .then(res => res.json())
  .then(data => {
    if (data.success && data.token) {
      sessionStorage.setItem("admin_auth", "true");
      sessionStorage.setItem("admin_user", data.user.username);
      sessionStorage.setItem("jwt_token", data.token);
      window.location.href = "/admin/dashboard.html";
    } else {
      document.getElementById("error").textContent = data.message || "Invalid credentials.";
    }
  })
  .catch(err => {
    console.error("Login error:", err);
    document.getElementById("error").textContent = "❌ Error connecting to server.";
  });
}
