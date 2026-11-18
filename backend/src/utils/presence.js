// Who is online right now: user id -> number of open tabs.
// A count (not true/false) because closing one of two tabs shouldn't mark you offline.
// This lives in the server's memory, which is fine for a single server like Render's free plan.
const openTabs = new Map();

// Returns true when this is the user's first open tab, i.e. they just came online
const markOnline = (userId) => {
  const id = String(userId);
  const count = (openTabs.get(id) || 0) + 1;
  openTabs.set(id, count);
  return count === 1;
};

// Returns true when that was the user's last open tab, i.e. they just went offline
const markOffline = (userId) => {
  const id = String(userId);
  const count = (openTabs.get(id) || 1) - 1;
  if (count <= 0) {
    openTabs.delete(id);
    return true;
  }
  openTabs.set(id, count);
  return false;
};

const isOnline = (userId) => openTabs.has(String(userId));

module.exports = { markOnline, markOffline, isOnline };
