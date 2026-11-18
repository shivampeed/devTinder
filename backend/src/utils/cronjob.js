const cron = require("node-cron");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const { queueEmail } = require("./emailQueue");
const ConnectionRequestModel = require("../models/connectionRequest");

// Servers like Render run on UTC, so without this "8 AM" would be 1:30 PM in India
const TIMEZONE = process.env.CRON_TIMEZONE || "Asia/Kolkata";

// This job will run at 8 AM in the morning everyday
cron.schedule(
  "0 8 * * *",
  async () => {
    // Send emails to all people who got requests the previous day
    try {
      const yesterday = subDays(new Date(), 1);

      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);

      const pendingRequests = await ConnectionRequestModel.find({
        status: "interested",
        createdAt: {
          $gte: yesterdayStart,
          $lt: yesterdayEnd,
        },
      }).populate("fromUserId toUserId");

      const listOfEmails = [
        ...new Set(
          pendingRequests
            // A deleted user would leave toUserId as null
            .filter((req) => req.toUserId)
            .map((req) => req.toUserId.emailId)
        ),
      ];

      console.log("Daily reminder going to " + listOfEmails.length + " people");

      for (const email of listOfEmails) {
        queueEmail({
          subject: "You have new connection requests on DevTinder",
          body: "Developers are interested in connecting with you. Log in to DevTinder to accept or reject their requests.",
          toEmailId: email,
        });
      }
    } catch (err) {
      console.error(err);
    }
  },
  { timezone: TIMEZONE }
);
