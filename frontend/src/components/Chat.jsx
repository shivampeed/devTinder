import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { getSocket } from "../utils/socket";
import { getErrorMessage } from "../utils/errors";
import { formatTime } from "../utils/time";
import { setManyPresence } from "../utils/presenceSlice";
import { PresenceAvatar, PresenceText } from "./OnlineStatus";

const ChatRoom = ({ targetUserId }) => {
  const user = useSelector((store) => store.user);
  const dispatch = useDispatch();
  const [targetUser, setTargetUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // "loading" -> getting messages, "ready" -> can chat, "blocked" -> not a connection, "error"
  const [status, setStatus] = useState("loading");
  const [pageError, setPageError] = useState("");
  const [online, setOnline] = useState(false);
  const [chatError, setChatError] = useState("");
  const [text, setText] = useState("");
  const listRef = useRef(null);
  // After older messages are added on top, keep the view where it was instead of jumping
  const scrollRestore = useRef(null);

  const myId = String(user?._id);

  useEffect(() => {
    const loadNewest = async () => {
      try {
        const res = await axios.get(BASE_URL + "/chat/" + targetUserId, {
          withCredentials: true,
        });
        setTargetUser(res.data.targetUser);
        dispatch(setManyPresence([res.data.targetUser]));
        setMessages(res.data.messages);
        setHasMore(res.data.hasMore);
        setStatus("ready");
      } catch (err) {
        setPageError(getErrorMessage(err));
        setStatus(err.response?.status === 403 ? "blocked" : "error");
      }
    };
    loadNewest();
  }, [targetUserId, dispatch]);

  useEffect(() => {
    // Only join the live chat once we know this person is a connection
    if (status !== "ready") return;

    const socket = getSocket();

    // "connect" also fires after a dropped connection comes back, so we re-join every time
    const onConnect = () => {
      setOnline(true);
      setChatError("");
      socket.emit("joinChat", { targetUserId });
    };
    const onDisconnect = () => setOnline(false);
    const onConnectError = () => {
      setOnline(false);
      setChatError("Can't connect to live chat right now. Retrying...");
    };
    const onChatError = (message) => setChatError(message);
    const onMessage = (message) => {
      // The one app-wide connection can carry other chats too; keep only this conversation
      const pair = [String(message.senderId), String(message.receiverId)].sort().join("_");
      if (pair !== [myId, String(targetUserId)].sort().join("_")) return;
      // Skip a message we already have, in case it arrives twice after a reconnect
      setMessages((prev) =>
        prev.some((m) => m._id === message._id) ? prev : [...prev, message]
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chatError", onChatError);
    socket.on("messageReceived", onMessage);
    // Already connected (you came from another page), so the "connect" event won't fire again
    if (socket.connected) {
      queueMicrotask(onConnect);
    }

    return () => {
      socket.emit("leaveChat", { targetUserId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chatError", onChatError);
      socket.off("messageReceived", onMessage);
    };
  }, [status, targetUserId, myId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (scrollRestore.current) {
      // Older messages were added above: move down by exactly how much the list grew
      const { height, top } = scrollRestore.current;
      list.scrollTop = list.scrollHeight - height + top;
      scrollRestore.current = null;
    } else {
      // Keep the newest message in view, like any chat app
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  const loadEarlier = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const res = await axios.get(
        BASE_URL + "/chat/" + targetUserId + "?before=" + messages[0]._id,
        { withCredentials: true }
      );
      const list = listRef.current;
      scrollRestore.current = { height: list.scrollHeight, top: list.scrollTop };
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m._id));
        return [...res.data.messages.filter((m) => !known.has(m._id)), ...prev];
      });
      setHasMore(res.data.hasMore);
    } catch (err) {
      setChatError(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || !online) return;
    getSocket().emit("sendMessage", { targetUserId, text: clean });
    setText("");
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center my-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (status === "blocked" || status === "error") {
    return (
      <div className="flex flex-col items-center gap-4 my-20 px-4 text-center">
        <p>{pageError}</p>
        <Link to="/connections" className="btn btn-primary">
          Back to Connections
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-6 px-4">
      <div className="card bg-base-300 w-full max-w-2xl shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-base-100">
          <Link to="/connections" className="btn btn-ghost btn-sm">
            ←
          </Link>
          <PresenceAvatar user={targetUser} size="w-10 h-10" />
          <div className="flex-1">
            <h2 className="font-bold">
              {targetUser.firstName + " " + (targetUser.lastName || "")}
            </h2>
            <PresenceText user={targetUser} className="text-xs" />
          </div>
        </div>

        <div ref={listRef} className="h-[60vh] overflow-y-auto p-4">
          {hasMore && (
            <div className="flex justify-center mb-4">
              <button
                className="btn btn-sm btn-ghost"
                onClick={loadEarlier}
                disabled={loadingMore}
              >
                {loadingMore && <span className="loading loading-spinner loading-xs"></span>}
                Load earlier messages
              </button>
            </div>
          )}
          {messages.length === 0 && (
            <p className="text-center opacity-60 my-10">
              No messages yet. Say hi to {targetUser.firstName}!
            </p>
          )}
          {messages.map((message) => {
            const isMine = String(message.senderId) === myId;
            return (
              <div
                key={message._id}
                className={"chat " + (isMine ? "chat-end" : "chat-start")}
              >
                <div className="chat-header">
                  {isMine ? "You" : message.firstName}
                  <time className="text-xs opacity-50 ml-1">
                    {formatTime(message.createdAt)}
                  </time>
                </div>
                <div
                  className={
                    "chat-bubble whitespace-pre-wrap break-words " +
                    (isMine ? "chat-bubble-primary" : "bg-base-100")
                  }
                >
                  {message.text}
                </div>
              </div>
            );
          })}
        </div>

        {chatError && <p className="text-error text-sm px-4">{chatError}</p>}

        <form className="flex gap-2 p-4" onSubmit={sendMessage}>
          <input
            type="text"
            value={text}
            maxLength={1000}
            placeholder={online ? "Type a message..." : "Connecting to chat..."}
            className="input flex-1"
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!online || !text.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

const Chat = () => {
  const { targetUserId } = useParams();
  // A new key gives each person's chat a fresh start when you switch between chats
  return <ChatRoom key={targetUserId} targetUserId={targetUserId} />;
};

export default Chat;
