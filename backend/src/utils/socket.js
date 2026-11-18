const socket = require("socket.io");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Message, getOrCreateChat } = require("../models/chat");
const User = require("../models/user");
const allowedOrigins = require("./allowedOrigins");
const { areConnected, getConnectionIds } = require("./connections");
const { markOnline, markOffline } = require("./presence");

const MAX_MESSAGE_LENGTH = 1000;

const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("$"))
    .digest("hex");
};

// Every user's tabs join their own private room, so we can send news to "this person"
const personalRoom = (userId) => "user:" + userId;

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      // Same list as the REST API, so chat works from the deployed site and not just localhost
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Tells this user's connections (and only them) that they came online or went offline
  const announcePresence = async (userId, isOnline, lastSeen) => {
    const friendIds = await getConnectionIds(userId);
    if (friendIds.length === 0) return;
    io.to(friendIds.map(personalRoom)).emit("presenceChanged", {
      userId: String(userId),
      isOnline,
      lastSeen,
    });
  };

  // Runs once per connection: who is this? Without it anyone could send messages as anyone.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Please Login!"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Only the short-lived chat token is accepted here, not some other kind of token
      if (decoded.purpose !== "socket") {
        return next(new Error("Invalid token"));
      }
      const user = await User.findById(decoded._id).select("firstName lastName");
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.data.user = user;
      // Remembers which chats this socket passed the "are you connected?" check for
      socket.data.allowedTargets = new Set();
      next();
    } catch (err) {
      next(new Error("Please Login!"));
    }
  });

  io.on("connection", (socket) => {
    const me = socket.data.user;
    const myId = me._id.toString();

    socket.join(personalRoom(myId));
    if (markOnline(myId)) {
      announcePresence(myId, true).catch((err) => console.log(err));
    }

    socket.on("joinChat", async ({ targetUserId } = {}) => {
      try {
        if (!targetUserId || !(await areConnected(myId, targetUserId))) {
          socket.emit("chatError", "You can only chat with your connections");
          return;
        }
        socket.data.allowedTargets.add(String(targetUserId));
        socket.join(getSecretRoomId(myId, String(targetUserId)));
      } catch (err) {
        console.log(err);
        socket.emit("chatError", "Could not join the chat");
      }
    });

    // The page calls this when you leave a chat, so its messages stop arriving in the next one
    socket.on("leaveChat", ({ targetUserId } = {}) => {
      if (!targetUserId) return;
      socket.leave(getSecretRoomId(myId, String(targetUserId)));
    });

    const handleSendMessage = async ({ targetUserId, text } = {}) => {
      try {
        const target = String(targetUserId || "");
        // Must have joined this chat first, which is where the connection check happens
        if (!socket.data.allowedTargets.has(target)) {
          socket.emit("chatError", "You can only chat with your connections");
          return;
        }

        const cleanText = String(text || "").trim();
        if (!cleanText) return;
        if (cleanText.length > MAX_MESSAGE_LENGTH) {
          socket.emit("chatError", `Messages can be at most ${MAX_MESSAGE_LENGTH} characters`);
          return;
        }

        const chat = await getOrCreateChat(myId, target);
        const saved = await Message.create({
          chatId: chat._id,
          senderId: myId,
          text: cleanText,
        });

        // Sender details come from the logged-in user, never from what the browser claims
        io.to(getSecretRoomId(myId, target)).emit("messageReceived", {
          _id: saved._id,
          senderId: myId,
          receiverId: target,
          firstName: me.firstName,
          lastName: me.lastName,
          text: saved.text,
          createdAt: saved.createdAt,
        });
      } catch (err) {
        console.log(err);
        socket.emit("chatError", "Message could not be sent");
      }
    };

    // Saving a message takes a moment; if you type fast, the next one could finish first
    // and show up out of order. Chaining them makes each message wait for the one before it.
    let sendQueue = Promise.resolve();
    socket.on("sendMessage", (payload) => {
      sendQueue = sendQueue.then(() => handleSendMessage(payload));
    });

    socket.on("disconnect", async () => {
      try {
        if (markOffline(myId)) {
          const lastSeen = new Date();
          await User.updateOne({ _id: myId }, { lastSeen });
          await announcePresence(myId, false, lastSeen);
        }
      } catch (err) {
        console.log(err);
      }
    });
  });
};

module.exports = initializeSocket;
