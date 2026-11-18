import { createSlice } from "@reduxjs/toolkit";

// userId -> { isOnline, lastSeen } for your connections.
// Filled from the API when a page loads, then kept fresh by live "presenceChanged" events.
const presenceSlice = createSlice({
  name: "presence",
  initialState: {},
  reducers: {
    setPresence: (state, action) => {
      const { userId, isOnline, lastSeen } = action.payload;
      state[userId] = {
        isOnline,
        // Going online doesn't send a time, so keep the last one we knew
        lastSeen: lastSeen || state[userId]?.lastSeen || null,
      };
    },
    setManyPresence: (state, action) => {
      action.payload.forEach(({ _id, isOnline, lastSeen }) => {
        state[_id] = { isOnline: Boolean(isOnline), lastSeen: lastSeen || null };
      });
    },
  },
});

export const { setPresence, setManyPresence } = presenceSlice.actions;
export default presenceSlice.reducer;
