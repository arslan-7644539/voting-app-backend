import jwt from "jsonwebtoken";

// Generate JWT token
export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h", // e.g., 1 hour
  });
}
// verifyTokken
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// jwtAuthMiddleware
export function jwtAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Expect “Bearer <token>”

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("🚀 ~ jwtAuthMiddleware ~ error:", error);
    res.status(401).json({ error: "Invalid Tokken" });
  }
}
