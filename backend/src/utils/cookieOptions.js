const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  // Keeps the token away from page JavaScript, so an XSS bug can't steal it
  httpOnly: true,
  // In production the site is served over https, and the browser should only send the token there
  secure: isProduction,
  // The Netlify proxy makes API calls same-site, so "lax" is enough and works in Safari too
  sameSite: "lax",
  path: "/",
};

const authCookieOptions = () => ({
  ...baseCookieOptions,
  // Matches the JWT lifetime so the cookie never outlives (or dies before) the token inside it
  expires: new Date(Date.now() + SEVEN_DAYS_MS),
});

module.exports = { baseCookieOptions, authCookieOptions };
