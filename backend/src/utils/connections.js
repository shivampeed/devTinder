const ConnectionRequest = require("../models/connectionRequest");

// Chat is only for matched users, so both chat routes and the socket ask this first
const areConnected = async (userId, otherUserId) => {
  const connection = await ConnectionRequest.findOne({
    status: "accepted",
    $or: [
      { fromUserId: userId, toUserId: otherUserId },
      { fromUserId: otherUserId, toUserId: userId },
    ],
  });
  return Boolean(connection);
};

// Ids of everyone this user is connected with; online/offline news only goes to them
const getConnectionIds = async (userId) => {
  const rows = await ConnectionRequest.find({
    status: "accepted",
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  }).select("fromUserId toUserId");

  return rows.map((row) =>
    String(row.fromUserId) === String(userId)
      ? String(row.toUserId)
      : String(row.fromUserId)
  );
};

module.exports = { areConnected, getConnectionIds };
