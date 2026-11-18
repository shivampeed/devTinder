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

module.exports = { areConnected };
