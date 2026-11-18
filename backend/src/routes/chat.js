const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { userAuth } = require("../middlewares/auth");
const { Chat, Message, getParticipantsKey } = require("../models/chat");
const User = require("../models/user");
const { areConnected } = require("../utils/connections");
const { isOnline } = require("../utils/presence");

const chatRouter = express.Router();

// How many messages one page holds; "Load earlier messages" fetches the next page
const PAGE_SIZE = 30;

// The live chat connects straight to this server (Netlify can't forward live sockets),
// so the login cookie isn't sent there. This short-lived token proves who the user is instead.
chatRouter.get("/socket-token", userAuth, (req, res) => {
  const token = jwt.sign(
    { _id: req.user._id, purpose: "socket" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
  res.json({ token });
});

// GET /chat/:targetUserId            -> the newest messages
// GET /chat/:targetUserId?before=ID  -> the page of messages older than message ID
chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { before } = req.query;
    const userId = req.user._id;

    // A bad id would make Mongo throw a confusing cast error
    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).send("ERROR: Invalid user id");
    }
    if (before && !mongoose.isValidObjectId(before)) {
      return res.status(400).send("ERROR: Invalid message id");
    }

    const targetUser = await User.findById(targetUserId).select(
      "firstName lastName photoUrl lastSeen"
    );
    if (!targetUser) {
      return res.status(404).send("ERROR: User not found");
    }

    if (!(await areConnected(userId, targetUserId))) {
      return res.status(403).send("ERROR: You can only chat with your connections");
    }

    const chat = await Chat.findOne({
      participantsKey: getParticipantsKey(userId, targetUserId),
    });

    let messages = [];
    let hasMore = false;

    if (chat) {
      const query = { chatId: chat._id };
      if (before) {
        query._id = { $lt: before };
      }

      // Newest first, and one extra so we know whether an older page exists
      const docs = await Message.find(query)
        .sort({ _id: -1 })
        .limit(PAGE_SIZE + 1)
        .populate("senderId", "firstName lastName");

      hasMore = docs.length > PAGE_SIZE;

      messages = docs
        .slice(0, PAGE_SIZE)
        // A deleted sender leaves senderId empty, and the page reads fields from it
        .filter((message) => message.senderId)
        .map((message) => ({
          _id: message._id,
          senderId: message.senderId._id,
          receiverId:
            String(message.senderId._id) === String(userId) ? targetUserId : userId,
          firstName: message.senderId.firstName,
          lastName: message.senderId.lastName,
          text: message.text,
          createdAt: message.createdAt,
        }))
        // Back to oldest-first, the order a chat is read in
        .reverse();
    }

    res.json({
      targetUser: { ...targetUser.toJSON(), isOnline: isOnline(targetUserId) },
      messages,
      hasMore,
    });
  } catch (err) {
    console.error(err);
    // Without a reply here the browser would wait forever
    res.status(400).send("ERROR: " + err.message);
  }
});

module.exports = chatRouter;
