import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import userRoutes from "./src/routes/userRoutes.js"; // Import user routes
import candidateRoutes from "./src/routes/candidateRoutes.js"; // Import candidate routes
import { ConnectDB } from "./src/utils/db.js";

// config dotenv file
dotenv.config();

//  Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------
// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// -------------------------------------------------
// Routes

// Fixed: Use app.get() instead of app.use() for the root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Job Portal API",
    status: "success",
  });
});

// Use user routes
app.use("/.netlify/functions/api/user", userRoutes);
// Use candidate routes
app.use("/.netlify/functions/api/candidate", candidateRoutes);

// -------------------------------------------------

// Connect to MongoDB and start the server
// ConnectDB()
//   .then(() => {
//     app.listen(PORT, () => {
//       console.log(`Server running on http://localhost:${PORT}`);
//     });
//     console.log(`Connected DB`);
//   })
//   .catch((error) => {
//     console.log("MongoDB Connection Error ", error);
//   });

export { app, ConnectDB };
