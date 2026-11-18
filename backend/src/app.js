// Load .env first, because some files below read process.env as soon as they are required
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");

const connectDB = require("./config/database");
const allowedOrigins = require("./utils/allowedOrigins");
const { isEmailConfigured } = require("./utils/sendEmail");

// Fail fast with a clear message instead of a confusing crash later
const requiredEnv = ["DB_CONNECTION_SECRET", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(
    `Missing environment variables: ${missingEnv.join(", ")}\n` +
      "Copy backend/.env.example to backend/.env and fill in the values."
  );
  process.exit(1);
}

const app = express();

// Render (and most hosts) sit behind a proxy; this lets Express see the real protocol and IP
app.set("trust proxy", 1);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const chatRouter = require("./routes/chat");
const initializeSocket = require("./utils/socket");

// Hosts ping this to check the server is alive, and the frontend uses it to wake a sleeping server
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.send("DevTinder API is running");
});

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", chatRouter);

// Catches errors like a broken JSON body so the client gets a clean message instead of an HTML stack trace
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).send("ERROR : " + (err.message || "Something went wrong"));
});

const server = http.createServer(app);
initializeSocket(server);

// The daily reminder email only makes sense when email sending is set up
if (isEmailConfigured()) {
  require("./utils/cronjob");
  console.log("Email is set up: new-request emails and the daily reminder are on.");
}

const PORT = process.env.PORT || 7777;

// The usual cause is the app already running in another Terminal window, so say that plainly
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Is the app already running in another Terminal window?\n` +
        `Stop it with Ctrl + C, or find it with:  lsof -i :${PORT}`
    );
    process.exit(1);
  }
  throw err;
});

connectDB()
  .then(() => {
    console.log("Database connection established...");
    server.listen(PORT, () => {
      console.log(`Server is successfully listening on port ${PORT}...`);
    });
  })
  .catch((err) => {
    console.error("Database cannot be connected!!");
    console.error(err.message);
    process.exit(1);
  });
