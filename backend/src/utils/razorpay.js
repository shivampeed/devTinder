const Razorpay = require("razorpay");

let instance = null;

// Created on first use, because new Razorpay() throws at startup when the keys are missing,
// and payments are optional for running the app
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

module.exports = getRazorpay;
