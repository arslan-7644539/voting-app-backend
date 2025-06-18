import express from "express";
// import user from "../models/User.js";
import { generateToken, jwtAuthMiddleware } from "../utils/jwt.js";
import User from "../models/user.js";
// -----------------------------------------------

const router = express.Router();

// User registration route
router.post("/signUp", async (req, res) => {
  try {
    // const { name, age, email, mobile, address, cnic, password } = req.body;
    // const rawData = req.body;
    const data = JSON.parse(req.body);
    const { email } = data;
    console.log("Received data for user registration:", data);

    // create a new user
    const newUser = new User(data);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const response = await newUser.save();
    console.log("User registered successfully:", response);
    // Save the user to the database

    const payload = {
      id: response._id,
    };
    console.log(JSON.stringify(payload));
    // generate a JWT token
    const token = generateToken(payload);
    console.log("Generated JWT token:", token);

    res.status(200).json({ response: response, token: token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User login route
router.post("/login", async (req, res) => {
  try {
    // extract email and password from request body
    const { password, cnic } = req.body;

    // find user by cnic
    const user = await User.findOne({ cnic: cnic, password: password });
    console.log(`User login attempt with CNIC:${cnic} & password:${password} `);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // generate a JWT token
    const payload = {
      id: user.id,
    };
    const token = generateToken(payload);
    console.log("Generated JWT token:", token);

    res.json({ token });
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
    const { oldPassword, newPassword } = req.body;
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

    // if (!(await userProfile.comparePassword(oldPassword))) {
    //   return res.status(400).json({ message: "Old password is incorrect" });
    // }

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

export default router;
