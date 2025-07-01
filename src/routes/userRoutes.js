import express from "express";
// import user from "../models/User.js";
import { generateToken, jwtAuthMiddleware } from "../utils/jwt.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import { fileUpload } from "../utils/multerConfige.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";

// -----------------------------------------------

const router = express.Router();

// User registration route
router.post("/signUp", fileUpload.single("photo"), async (req, res) => {
  try {
    // const data = JSON.parse(req.body);
    const { name, email, password, mobile, photo } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);
    // file path
    // const photoPath = req.file ? req.file.buffer.toString('base64') : null;
    const photoPath = req.file ? req.file.path : null;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(photoPath, {
      folder: "profile-photos",
    });

    // Delete temp file from uploads folder
    fs.unlinkSync(req.file.path);

    // Create new user instance
    const newUser = new User({
      name,
      email,
      mobile,
      password: hash,
      photo: result.secure_url,
    });

    // Save to DB
    const response = await newUser.save();

    // Create JWT payload
    const payload = { id: response._id };

    // Generate token
    const token = generateToken(payload); // ⬅️ This function should be defined in utils

    // Respond with user and token
    res.status(200).json({
      message: "User registered successfully",
      user: {
        id: response._id,
        email: response.email,
        name: response.name,
      },
      token,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User login route
router.post("/login", async (req, res) => {
  try {
    // extract email and password from request body
    const data = JSON.parse(req.body);
    const { password, email } = data;

    // find user by email
    const user = await User.findOne({ email });
    console.log(`User login attempt with email:${email} `);

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!user || !isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // generate a JWT token
    const payload = {
      id: user.id,
    };
    const token = generateToken(payload);
    console.log("Generated JWT token:", token);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        cnic: user.cnic,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user profile route
router.get("/profile", jwtAuthMiddleware, async (req, res) => {
  try {
    // Assuming req.user is set by the JWT middleware

    const userData = req.user;

    const userId = userData.id;
    console.log("Fetching profile for user ID:", userId);

    // Find user by ID
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log("User profile fetched successfully:", userProfile);
    // Return user profile

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//  change user password route
router.put("/profile/password", jwtAuthMiddleware, async (req, res) => {
  try {
    const data = JSON.parse(req.body);
    const { oldPassword, newPassword } = data;
    const userId = req.user.id;

    // Find user by ID
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if old password matches
    if (userProfile.password !== oldPassword) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Update password
    userProfile.password = newPassword;
    await userProfile.save();

    console.log("Password changed successfully for this user ==> id:", userId);
    // Return success response

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// logged out route
router.get("/logout", jwtAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find and update user's online status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
