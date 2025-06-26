import jwt from "jsonwebtoken";

// Generate JWT token
export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h", // e.g., 1 hour
  });
}

// jwtAuthMiddleware
export function jwtAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Expect “Bearer <token>”

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

// authMiddleware
export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ msg: "Unauthorized" });
};
