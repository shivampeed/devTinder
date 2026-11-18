import { io } from "socket.io-client";
import axios from "axios";
import { BASE_URL } from "./constants";

// Empty on your Mac (chat goes through the Vite proxy); the Render address on Netlify
const SOCKET_URL = __BACKEND_URL__;

// One live connection for the whole app while you're logged in.
// It powers chat and also tells your connections that you're online.
let socket = null;

export const getSocket = () => {
  if (socket) return socket;

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

  socket = SOCKET_URL ? io(SOCKET_URL, options) : io(options);
  return socket;
};

// Called on logout, so the next person on this computer doesn't reuse the old connection
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
