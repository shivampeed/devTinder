const express = require("express");
const authRouter = express.Router();

const { validateSignUpData } = require("../utils/validation");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { authCookieOptions, baseCookieOptions } = require("../utils/cookieOptions");

authRouter.post("/signup", async (req, res) => {
  try {
    // Validation of data
    validateSignUpData(req);

    const { firstName, lastName, emailId, password } = req.body;

    // Encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);

    //   Creating a new instance of the User model
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    const savedUser = await user.save();
    const token = await savedUser.getJWT();

    res.cookie("token", token, authCookieOptions());

    res.json({ message: "User Added successfully!", data: savedUser });
  } catch (err) {
    // Mongo's duplicate key error is cryptic, so turn it into something a person can read
    if (err.code === 11000) {
      return res.status(400).send("ERROR : An account with this email already exists");
    }
    res.status(400).send("ERROR : " + err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      throw new Error("Email and password are required");
    }

    // Emails are saved in lowercase, so match the same way or "Ak@x.com" would never log in
    const user = await User.findOne({ emailId: String(emailId).toLowerCase().trim() });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      const token = await user.getJWT();

      res.cookie("token", token, authCookieOptions());
      res.send(user);
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

authRouter.post("/logout", async (req, res) => {
  // The browser only deletes a cookie when the options match the ones it was set with
  res.clearCookie("token", baseCookieOptions);
  res.send("Logout Successful!!");
});

module.exports = authRouter;
