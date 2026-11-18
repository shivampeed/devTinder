const { SendEmailCommand } = require("@aws-sdk/client-ses");
const { sesClient } = require("./sesClient.js");

const isEmailConfigured = () =>
  Boolean(
    process.env.AWS_ACCESS_KEY &&
      process.env.AWS_SECRET_KEY &&
      process.env.SES_FROM_EMAIL
  );

// Names come from users, so a name like "<script>" must show as text, not run as HTML
const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const createSendEmailCommand = (toAddress, fromAddress, subject, body) => {
  return new SendEmailCommand({
    Destination: {
      CcAddresses: [],
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<h2>${escapeHtml(body)}</h2>`,
        },
        Text: {
          Charset: "UTF-8",
          Data: body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [],
  });
};

const run = async (subject, body, toEmailId) => {
  // Addresses come from the caller and .env, so mail goes to the real user, not a hardcoded inbox
  const sendEmailCommand = createSendEmailCommand(
    toEmailId,
    process.env.SES_FROM_EMAIL,
    subject,
    body
  );

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (caught) {
    if (caught instanceof Error && caught.name === "MessageRejected") {
      const messageRejectedError = caught;
      return messageRejectedError;
    }
    throw caught;
  }
};

module.exports = { run, isEmailConfigured, escapeHtml };
