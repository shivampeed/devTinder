// "/api" is forwarded to the backend by Vite on your Mac and by Netlify when deployed.
// Set VITE_API_URL only if you want to call a backend URL directly instead.
export const BASE_URL = import.meta.env.VITE_API_URL || "/api";
