// FRONTEND_URL can hold more than one address (comma separated), e.g. your Netlify URL and localhost
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

module.exports = allowedOrigins;
