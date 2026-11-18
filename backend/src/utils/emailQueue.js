const sendEmail = require("./sendEmail");

// Amazon SES only allows a few emails per second (1 per second in sandbox mode),
// so emails wait in this line and go out one at a time instead of all at once.
// For real bulk email you'd use a queue library like bull, which needs a Redis server.
const GAP_BETWEEN_EMAILS_MS = Number(process.env.EMAIL_GAP_MS) || 1100;

const queue = [];
let working = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async () => {
  if (working) return;
  working = true;
  while (queue.length > 0) {
    const { subject, body, toEmailId } = queue.shift();
    try {
      await sendEmail.run(subject, body, toEmailId);
      console.log("Email sent to " + toEmailId);
    } catch (err) {
      // One bad address shouldn't stop the emails waiting behind it
      console.error("Email to " + toEmailId + " failed: " + err.message);
    }
    if (queue.length > 0) {
      await wait(GAP_BETWEEN_EMAILS_MS);
    }
  }
  working = false;
};

// Returns right away, so an API request never waits for an email to be sent
const queueEmail = ({ subject, body, toEmailId }) => {
  if (!sendEmail.isEmailConfigured() || !toEmailId) return;
  queue.push({ subject, body, toEmailId });
  processQueue();
};

module.exports = { queueEmail };
