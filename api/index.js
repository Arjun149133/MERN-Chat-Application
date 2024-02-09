const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const asyncHandler = require("express-async-handler");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const ws = require("ws");
const Message = require("./models/Message");

const User = require("./models/User");

// Connect to MongoDB
const connectDB = require("./config/db");
connectDB();
const jwtSecret = process.env.JWT_SECRET;

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (!token) {
      return resolve(null);
    }
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) {
        return resolve(null);
      }
      resolve(userData);
    });
  });
}

app.get("/test", (req, res) => {
  res.json("tesk Ok");
});

app.get(
  "/messages/:userId",
  asyncHandler(async (req, res) => {
    const userData = await getUserDataFromRequest(req);
    if (!userData) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { userId } = req.params;
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    })
      .sort({ createdAt: 1 })
      .exec();
    res.json(messages);
  })
);

app.get(
  "/people",
  asyncHandler(async (req, res) => {
    const users = await User.find({}, { username: 1, _id: 1 });
    res.json(users);
  })
);

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized no token" });
  }
  jwt.verify(token, jwtSecret, {}, (err, userData) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.status(200).json(userData);
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (isPasswordValid) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).status(200).json({
            id: foundUser._id,
            username,
          });
        }
      );
    }
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

app.post(
  "/register",
  asyncHandler(async (req, res) => {
    try {
      const { username, password } = req.body;
      const createdUser = await User.create({
        username,
        password: await bcrypt.hash(password, 10),
      });
      jwt.sign(
        { userId: createdUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(201)
            .json({
              id: createdUser._id,
              username,
            });
        }
      );
    } catch (error) {
      //   res.status(400).json({ message: "Username already exists" });
      res.status(500).json(error);
    }
  })
);

const server = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

const wss = new ws.Server({ server });

wss.on("connection", (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  //read username and id from the cookie for the connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) {
            throw err;
            connection.close();
          } else {
            const { userId, username } = userData;
            connection.userId = userId;
            connection.username = username;
          }
        });
      }
    }
  }

  //notify everyone about online people
  [...wss.clients].forEach((client) => {
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.userId,
          username: c.username,
        })),
      })
    );
  });

  connection.on(
    "message",
    asyncHandler(async (message) => {
      const messageData = JSON.parse(message.toString());
      const { recepient, text } = messageData;
      if (recepient && text) {
        const messageDoc = await Message.create({
          text,
          sender: connection.userId,
          recipient: recepient,
        });
        [...wss.clients]
          .filter((c) => c.userId === recepient)
          .forEach((c) => {
            c.send(
              JSON.stringify({
                sender: connection.userId,
                recepient,
                text,
                _id: messageDoc._id,
              })
            );
          });
      }
    })
  );

  notifyAboutOnlinePeople();
});
