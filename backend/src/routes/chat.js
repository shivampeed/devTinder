const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { userAuth } = require("../middlewares/auth");
const { Chat } = require("../models/chat");
const User = require("../models/user");
const { areConnected } = require("../utils/connections");

const chatRouter = express.Router();

// Keeps the first page load fast even when a chat gets long
const MAX_MESSAGES = 200;

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

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    // A bad id would make Mongo throw a confusing cast error
    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).send("ERROR: Invalid user id");
    }

    const targetUser = await User.findById(targetUserId).select(
      "firstName lastName photoUrl"
    );
    if (!targetUser) {
      return res.status(404).send("ERROR: User not found");
    }

    if (!(await areConnected(userId, targetUserId))) {
      return res.status(403).send("ERROR: You can only chat with your connections");
    }

    const chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    }).populate({
      path: "messages.senderId",
      select: "firstName lastName",
    });

    const messages = (chat?.messages || [])
      .slice(-MAX_MESSAGES)
      // A deleted sender leaves senderId empty, and the page reads fields from it
      .filter((message) => message.senderId)
      .map((message) => ({
        _id: message._id,
        senderId: message.senderId._id,
        firstName: message.senderId.firstName,
        lastName: message.senderId.lastName,
        text: message.text,
        createdAt: message.createdAt,
      }));

    res.json({ targetUser, messages });
  } catch (err) {
    console.error(err);
    // Without a reply here the browser would wait forever
    res.status(400).send("ERROR: " + err.message);
  }
});

module.exports = chatRouter;
