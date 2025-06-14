import express from "express";
// import user from "../models/User.js";
import { generateToken, jwtAuthMiddleware } from "../utils/jwt.js";
import Candidate from "../models/candidate.js";
import User from "../models/user.js";
// -----------------------------------------------

const router = express.Router();

const checkIsAdmin = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user.role === "admin"; // Assuming 'role' is a field in the user model
  } catch (error) {
    console.error("Error checking if user is admin:", error);
    return false;
  }
};

// candidate registration route
router.post("/", jwtAuthMiddleware, async (req, res) => {
  try {
    // console.log("user ID from request:", req.user);
    // Check if the user is an admin
    if (!(await checkIsAdmin(req.user.id))) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    // const { name, age, email, mobile, address, cnic, password } = req.body;
    const data = req.body;
    const { name, party } = data;
    console.log("Received data for candidate registration:", data);

    // create a new user
    const newCandidate = new Candidate(data);

    // Check if user already exists
    const existingCandidate = await Candidate.findOne({ name, party });
    if (existingCandidate) {
      return res
        .status(400)
        .json({ message: "particular candidate already exists" });
    }

    const response = await newCandidate.save();
    console.log("newCandidate registered successfully:", response);
    // Save the Candidate to the database

    // const payload = {
    //   id: response._id,
    // };
    // console.log(JSON.stringify(payload));
    // generate a JWT token
    // const token = generateToken(payload);
    // console.log("Generated JWT token:", token);

    res.status(200).json({ response: response });
  } catch (error) {
    console.error("Error registering candidate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// -----------------------------------------------------------------
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
// -----------------------------------------------------------------

//  change Candidate info route
router.put("/:condidateID", jwtAuthMiddleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (!(await checkIsAdmin(req.user.id))) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const condidateID = req.params.condidateID;
    const updatedCadidateData = req.body;

    const response = await Candidate.findByIdAndUpdate(
      condidateID,
      updatedCadidateData,
      { new: true, runValidators: true } // Return the updated document
    );

    if (!response) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    console.log("Candidate updated successfully:", response);
    // Return success response
    res
      .status(200)
      .json({ message: "Candidate updated successfully", response });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//  delete Candidate info route
router.delete("/:condidateID", jwtAuthMiddleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (!(await checkIsAdmin(req.user.id))) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const condidateID = req.params.condidateID;
    console.log("Deleting candidate with ID:", condidateID);
    // Find and delete the candidate by ID
    const response = await Candidate.findByIdAndDelete(condidateID);

    if (!response) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    console.log("Candidate deleted successfully:", response);
    // Return success response
    res
      .status(200)
      .json({ message: "Candidate deleted successfully", response });
  } catch (error) {
    console.error("Error delete candidate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// get start for votting

router.post("/vote/:candidateID", jwtAuthMiddleware, async (req, res) => {
  const candidateID = req.params.candidateID;
  const userId = req.user.id;

  try {
    // find candidate with id
    const candidate = await Candidate.findById(candidateID);
    if (!candidate) {
      return res.status(404).json({ message: "candidate not found" });
    }

    // find user with user id
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    // check user role becaue admin role is not eligible for vote
    if (user.role === "admin") {
      return res.status(403).json({ message: "admin is not allowed" });
    }

    // check user is voted or not
    if (user.isVoted) {
      return res.status(400).json({ message: "you have alredy voted" });
    }

    // update candidate document to record the vote
    candidate.votes.push({ user: userId });
    candidate.voteCount++;
    await candidate.save();

    // update user documents
    user.isVoted = true;
    await user.save();

    res.status(200).json({ message: "vote recorded successfully" });
  } catch (error) {
    console.error("Error delete candidate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// route for vote count
router.get("/vote/count", async (req, res) => {
  try {
    // find all candidate with sorting order
    const candidate = await Candidate.find().sort({ voteCount: "desc" });

    // map the candidate and return only party name &  voteCount
    const voteRecord = candidate.map((data) => {
      return {
        party: data.party,
        voteCount: data.voteCount,
      };
    });

    return res.status(200).json(voteRecord);
  } catch (error) {
    console.error("Error delete candidate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
