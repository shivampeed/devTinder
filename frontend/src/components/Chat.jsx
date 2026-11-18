import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { createSocketConnection } from "../utils/socket";
import { getErrorMessage } from "../utils/errors";
import { DEFAULT_PHOTO, handleImageError } from "../utils/images";

const formatTime = (date) =>
  date
    ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

const ChatRoom = ({ targetUserId }) => {
  const user = useSelector((store) => store.user);
  const [targetUser, setTargetUser] = useState(null);
  const [messages, setMessages] = useState([]);
  // "loading" -> getting old messages, "ready" -> can chat, "blocked" -> not a connection, "error"
  const [status, setStatus] = useState("loading");
  const [pageError, setPageError] = useState("");
  const [online, setOnline] = useState(false);
  const [chatError, setChatError] = useState("");
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await axios.get(BASE_URL + "/chat/" + targetUserId, {
          withCredentials: true,
        });
        setTargetUser(res.data.targetUser);
        setMessages(res.data.messages);
        setStatus("ready");
      } catch (err) {
        setPageError(getErrorMessage(err));
        setStatus(err.response?.status === 403 ? "blocked" : "error");
      }
    };
    loadHistory();
  }, [targetUserId]);

  useEffect(() => {
    // Only open the live connection once we know this person is a connection
    if (status !== "ready") return;

    const socket = createSocketConnection();
    socketRef.current = socket;

    // "connect" also fires after a dropped connection comes back, so we re-join the room every time
    socket.on("connect", () => {
      setOnline(true);
      setChatError("");
      socket.emit("joinChat", { targetUserId });
    });
    socket.on("disconnect", () => setOnline(false));
    socket.on("connect_error", () => {
      setOnline(false);
      setChatError("Can't connect to live chat right now. Retrying...");
    });
    socket.on("chatError", (message) => setChatError(message));
    socket.on("messageReceived", (message) => {
      // Skip a message we already have, in case it arrives twice after a reconnect
      setMessages((prev) =>
        prev.some((m) => m._id === message._id) ? prev : [...prev, message]
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, targetUserId]);

  useEffect(() => {
    // Keep the newest message in view, like any chat app
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || !online || !socketRef.current) return;
    socketRef.current.emit("sendMessage", { targetUserId, text: clean });
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
          <img
            className="w-10 h-10 rounded-full object-cover"
            src={targetUser?.photoUrl || DEFAULT_PHOTO}
            alt="photo"
            onError={handleImageError}
          />
          <div className="flex-1">
            <h2 className="font-bold">
              {targetUser?.firstName + " " + (targetUser?.lastName || "")}
            </h2>
            <p className="text-xs opacity-70">
              {online ? "Live" : "Connecting..."}
            </p>
          </div>
        </div>

        <div ref={listRef} className="h-[60vh] overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-center opacity-60 my-10">
              No messages yet. Say hi to {targetUser?.firstName}!
            </p>
          )}
          {messages.map((message) => {
            const isMine = String(message.senderId) === String(user?._id);
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
            placeholder="Type a message..."
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
