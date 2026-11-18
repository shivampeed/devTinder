const mongoose = require("mongoose");

// The two user ids in a fixed order, e.g. "aaa_bbb", so each pair of users has exactly one chat
const getParticipantsKey = (userId, otherUserId) =>
  [String(userId), String(otherUserId)].sort().join("_");

const chatSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    participantsKey: {
      type: String,
      required: true,
      // Stops two chats being created when both people send their first message at the same moment
      unique: true,
    },
  },
  { timestamps: true }
);

// Each message is its own document instead of one ever-growing list inside the chat,
// so we can load just the newest few and fetch older ones only when asked
const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxLength: 1000,
    },
  },
  { timestamps: true }
);

// Makes "newest messages of this chat" fast even when a chat has thousands of messages
messageSchema.index({ chatId: 1, _id: -1 });

const Chat = mongoose.model("Chat", chatSchema);
const Message = mongoose.model("Message", messageSchema);

// Finds the chat for two users, creating it the first time they talk
const getOrCreateChat = async (userId, otherUserId) => {
  const filter = { participantsKey: getParticipantsKey(userId, otherUserId) };
  try {
    return await Chat.findOneAndUpdate(
      filter,
      { $setOnInsert: { participants: [userId, otherUserId] } },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Both people sent a first message at the same moment and the other one created the chat;
    // the unique key blocked a duplicate, so just use the chat that now exists
    if (err.code === 11000) {
      return Chat.findOne(filter);
    }
    throw err;
  }
};

module.exports = { Chat, Message, getParticipantsKey, getOrCreateChat };
