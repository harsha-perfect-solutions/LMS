const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production-environment-123456789";

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      ...decoded,
      id: user.id,
      userId: user.id,
      name: user.name,
      active: user.active,
      role: user.role,
      branch: user.branch,
      year: user.year,
      sem: user.sem,
      section: user.section,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(String(req.user.role).toUpperCase())) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
  JWT_SECRET,
};
