import { combineReducers, configureStore } from "@reduxjs/toolkit";
import userReducer, { removeUser } from "./userSlice";
import feedReducer from "./feedSlice";
import connectionsReducer from "./connectionsSlice";
import requestReducer from "./requestSlice";
import presenceReducer from "./presenceSlice";

const appReducer = combineReducers({
  user: userReducer,
  feed: feedReducer,
  connections: connectionsReducer,
  requests: requestReducer,
  presence: presenceReducer,
});

const rootReducer = (state, action) => {
  // On logout, wipe everything; otherwise the next person to log in would see the old feed and connections
  if (action.type === removeUser.type) {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

const appStore = configureStore({
  reducer: rootReducer,
});

export default appStore;
