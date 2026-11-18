const socket = require("socket.io");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Chat } = require("../models/chat");
const User = require("../models/user");
const allowedOrigins = require("./allowedOrigins");
const { areConnected } = require("./connections");

const MAX_MESSAGE_LENGTH = 1000;

const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("$"))
    .digest("hex");
};

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      // Same list as the REST API, so chat works from the deployed site and not just localhost
      origin: allowedOrigins,
      credentials: true,
    },
  });

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

    socket.on("sendMessage", async ({ targetUserId, text } = {}) => {
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

        let chat = await Chat.findOne({
          participants: { $all: [myId, target] },
        });

        if (!chat) {
          chat = new Chat({
            participants: [myId, target],
            messages: [],
          });
        }

        chat.messages.push({
          senderId: myId,
          text: cleanText,
        });

        await chat.save();
        const saved = chat.messages[chat.messages.length - 1];

        // Sender details come from the logged-in user, never from what the browser claims
        io.to(getSecretRoomId(myId, target)).emit("messageReceived", {
          _id: saved._id,
          senderId: myId,
          firstName: me.firstName,
          lastName: me.lastName,
          text: saved.text,
          createdAt: saved.createdAt,
        });
      } catch (err) {
        console.log(err);
        socket.emit("chatError", "Message could not be sent");
      }
    });

    socket.on("disconnect", () => {});
  });
};

module.exports = initializeSocket;
