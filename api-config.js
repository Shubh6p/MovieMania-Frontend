// api-config.js
// Single point of configuration for the backend API base URL
const API_BASE_URL = 'https://moviemania-backend-31wk.onrender.com';

// Bulletproof check: strip trailing slash if present to avoid double-slashes in fetches
window.API_BASE_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
