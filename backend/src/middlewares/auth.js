const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).send("Please Login!");
    }

    const decodedObj = jwt.verify(token, process.env.JWT_SECRET);

    // The short-lived chat token must not work as a login cookie
    if (decodedObj.purpose) {
      throw new Error("Invalid token");
    }

    const { _id } = decodedObj;

    const user = await User.findById(_id);
    if (!user) {
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (err) {
    // 401 (not 400) so the frontend knows to send the user back to the login page
    res.status(401).send("ERROR: " + err.message);
  }
};

module.exports = {
  userAuth,
};
