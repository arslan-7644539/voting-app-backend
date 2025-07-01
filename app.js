import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import userRoutes from "./src/routes/userRoutes.js";
import candidateRoutes from "./src/routes/candidateRoutes.js";
import { ConnectDB } from "./src/utils/db.js";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { verifyToken } from "./src/utils/jwt.js";
import User from "./src/models/user.js";

// Configure environment variables
dotenv.config();

// Initialize express app
const app = express();
const router = express.Router();

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// express jason Middleware
app.use(express.json()); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
app.use(cors());
// app.use(cookieParser());

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Tokken is missing"));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error("Authentication error: Invalid token"));
    }

    const user = await user.findById(decoded.userId).select("-password");
    if (!user) {
      return next(new Error("Authentication error: user not found"));
    }

    socket.userId = user._id.toString();
    socket.userInfo = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    };

    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// Store online users and their info
const onlineUsers = new Map();

// CHANGE 1: Enhanced room management with detailed information
const chatRooms = new Map();

// CHANGE 2: Default rooms that always exist
const defaultRooms = [
  { id: "general", name: "General", description: "General discussion" },
  { id: "random", name: "Random", description: "Random topics" },
  { id: "tech", name: "Tech Talk", description: "Technology discussions" },
];

// CHANGE 3: Initialize default rooms
defaultRooms.forEach((room) => {
  chatRooms.set(room.id, {
    id: room.id,
    name: room.name,
    description: room.description,
    users: new Map(),
    messages: [],
    createdAt: new Date(),
    isDefault: true,
  });
});

// CHANGE 4: Helper function to get room info for broadcasting
function getRoomInfo(roomId) {
  const room = chatRooms.get(roomId);
  if (!room) return null;

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    userCount: room.users.size,
    users: Array.from(room.users.values()),
    isDefault: room.isDefault || false,
  };
}

// CHANGE 5: Helper function to get all available rooms
function getAllRooms() {
  return Array.from(chatRooms.values()).map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    userCount: room.users.size,
    isDefault: room.isDefault || false,
  }));
}

router.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Job Portal API",
    status: "success",
  });
});

app.get("/rooms", (req, res) => {
  res.json({
    success: true,
    rooms: getAllRooms(),
  });
});

// API Routes
router.use("/user", userRoutes);
router.use("/candidate", candidateRoutes);

// Mount router at Netlify Functions base path
app.use("/.netlify/functions/api", router);

// Socket.IO connection handling
io.on("connection", async (socket) => {
  console.log(`🟢 User connected: ${socket.userInfo.username} (${socket.id})`);

  // User ko database mein online mark karein
  await User.findByIdAndUpdate(socket.userId, {
    isOnline: true,
    lastSeen: new Date(),
  });

  // Send available rooms to newly connected user
  socket.emit("rooms-list", getAllRooms());

  // Join handler (modified for authenticated users)
  socket.on("join", (userData) => {
    const { roomId = "general" } = userData;

    // Store user info with database data
    onlineUsers.set(socket.id, {
      id: socket.userId,
      username: socket.userInfo.username,
      avatar: socket.userInfo.avatar,
      email: socket.userInfo.email,
      joinedAt: new Date(),
      currentRoom: roomId,
    });

    // Join the specified room
    socket.join(roomId);

    // Add user to room's user list
    const room = chatRooms.get(roomId);
    if (room) {
      room.users.set(socket.id, onlineUsers.get(socket.id));
    }

    // Broadcast updated room info to room members
    io.to(roomId).emit("room-users-update", getRoomInfo(roomId));

    // Send welcome message
    socket.emit("system-message", {
      type: "welcome",
      content: `Welcome to ${room?.name || "the chat"}, ${
        socket.userInfo.username
      }! 👋`,
      timestamp: new Date(),
      roomId: roomId,
    });

    // Broadcast join message to room
    socket.to(roomId).emit("system-message", {
      type: "join",
      content: `${socket.userInfo.username} joined the room`,
      timestamp: new Date(),
      roomId: roomId,
    });

    console.log(
      `👤 ${socket.userInfo.username} joined room: ${room?.name || roomId}`
    );
  });

  // Rest of the socket handlers remain the same...
  // (switch-room, create-room, send-message, typing handlers, etc.)

  // Disconnect handler
  socket.on("disconnect", async () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log(`🔴 ${user.username} disconnected`);

      // User ko database mein offline mark karein
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      const roomId = user.currentRoom;
      const room = chatRooms.get(roomId);

      // Remove user from room
      if (room) {
        room.users.delete(socket.id);

        // Broadcast leave message to room
        socket.to(roomId).emit("system-message", {
          type: "leave",
          content: `${user.username} left the room`,
          timestamp: new Date(),
          roomId: roomId,
        });

        // Update room users
        io.to(roomId).emit("room-users-update", getRoomInfo(roomId));
      }

      // Remove user from online list
      onlineUsers.delete(socket.id);
    }
  });
});

export { server, ConnectDB };
