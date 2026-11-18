import { useEffect, useState } from "react";

// Re-renders every minute, so "last seen 5 minutes ago" keeps counting up while the page is open
export const useNow = (everyMs = 60000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
};
