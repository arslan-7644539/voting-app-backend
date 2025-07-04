import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import userRoutes from "./src/routes/userRoutes.js";
import candidateRoutes from "./src/routes/candidateRoutes.js";
import { ConnectDB } from "./src/utils/db.js";
import cookieParser from "cookie-parser";

// Configure environment variables
dotenv.config();

// Initialize express app
const app = express();
const router = express.Router();

// express jason Middleware
app.use(express.json()); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
app.use(cors());
// app.use(cookieParser());

// Root Route
router.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Job Portal API",
    status: "success",
  });
});

// API Routes
router.use("/user", userRoutes);
router.use("/candidate", candidateRoutes);

// Mount router at Netlify Functions base path
app.use("/.netlify/functions/api", router);

export { app, ConnectDB };
