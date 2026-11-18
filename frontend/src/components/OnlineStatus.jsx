import { useSelector } from "react-redux";
import { timeAgo } from "../utils/time";
import { useNow } from "../utils/useNow";
import { DEFAULT_PHOTO, handleImageError } from "../utils/images";

// Reads the live status from the store, falling back to what the page loaded
const usePresence = (userId, fallback) => {
  const live = useSelector((store) => store.presence[userId]);
  return live || { isOnline: Boolean(fallback?.isOnline), lastSeen: fallback?.lastSeen };
};

// Round profile photo with a green dot when the person is online
export const PresenceAvatar = ({ user, size = "w-20 h-20" }) => {
  const { isOnline } = usePresence(user._id, user);
  return (
    <div className={"relative shrink-0 " + size}>
      <img
        className="w-full h-full rounded-full object-cover"
        src={user.photoUrl || DEFAULT_PHOTO}
        alt="photo"
        onError={handleImageError}
      />
      {isOnline && (
        <span
          className="absolute bottom-0 right-0 w-1/4 h-1/4 min-w-3 min-h-3 rounded-full bg-success border-2 border-base-300"
          title="Online"
        ></span>
      )}
    </div>
  );
};

// "Online" in green, or "Last seen 2 hours ago"
export const PresenceText = ({ user, className = "text-sm" }) => {
  const now = useNow();
  const { isOnline, lastSeen } = usePresence(user._id, user);
  if (isOnline) {
    return <p className={className + " text-success"}>● Online</p>;
  }
  return (
    <p className={className + " opacity-70"}>
      {lastSeen ? "Last seen " + timeAgo(lastSeen, now) : "Offline"}
    </p>
  );
};
