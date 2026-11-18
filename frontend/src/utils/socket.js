import { io } from "socket.io-client";
import axios from "axios";
import { BASE_URL } from "./constants";

// Empty on your Mac (chat goes through the Vite proxy); the Render address on Netlify
const SOCKET_URL = __BACKEND_URL__;

export const createSocketConnection = () => {
  const options = {
    // Skips the slow fallback mode and opens a live connection right away
    transports: ["websocket"],
    // Asked for on every connect and reconnect, so an expired token is never reused
    auth: async (cb) => {
      try {
        const res = await axios.get(BASE_URL + "/socket-token", {
          withCredentials: true,
        });
        cb({ token: res.data.token });
      } catch {
        cb({});
      }
    },
  };

  return SOCKET_URL ? io(SOCKET_URL, options) : io(options);
};
