// Runs after "vite build" on Netlify. Writes dist/_redirects so that:
//   /api/*  is forwarded to your backend (set BACKEND_URL in Netlify's environment variables)
//   /*      falls back to index.html, so refreshing /profile or /connections doesn't 404
import { writeFileSync } from "node:fs";

const backendUrl = (process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");

if (!/^https?:\/\//.test(backendUrl)) {
  console.error(
    "\nBACKEND_URL is not set (or doesn't start with http/https).\n" +
      "In Netlify: Site configuration > Environment variables > add BACKEND_URL\n" +
      "with your backend address, e.g. https://devtinder-api.onrender.com\n"
  );
  process.exit(1);
}

const rules = [
  // "200!" makes this a proxy (rewrite), so the browser sees one site and keeps the login cookie
  `/api/*  ${backendUrl}/:splat  200!`,
  `/*  /index.html  200`,
].join("\n");

writeFileSync("dist/_redirects", rules + "\n");
console.log("Wrote dist/_redirects:\n" + rules);
