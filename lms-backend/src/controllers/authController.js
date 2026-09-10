const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { JWT_SECRET } = require("../middleware/auth");
const { sendOtpEmail } = require("../utils/mailer");

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long, include uppercase, lowercase, a number, and a special character." 
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: String(role).toUpperCase(),
      active: true,
      isVerified: false,
      verificationOtp: otp,
    });

    console.log(`[AUTH] OTP for ${email}: ${otp}`);
    await sendOtpEmail(email, otp);

    return res.status(201).json({ 
      message: "Registration successful. Please verify your email.",
      email: user.email 
    });
  } catch (error) {
    return res.status(500).json({ message: "Error registering user", error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });
    if (user.verificationOtp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    await user.update({ isVerified: true, verificationOtp: null });

    return res.json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    return res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await user.update({ verificationOtp: otp });

    console.log(`[AUTH] New OTP for ${email}: ${otp}`);
    await sendOtpEmail(email, otp);

    return res.json({ message: "New OTP sent successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Error resending OTP", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.active) return res.status(403).json({ message: "Account disabled" });
    
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Email not verified. Please verify your email first.",
        requiresVerification: true,
        email: user.email 
      });
    }

    const token = generateToken(user);
    return res.json({ 
      token, 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      branch: user.branch,
      year: user.year,
      sem: user.sem,
      section: user.section,
      message: "Login successful"
    });
  } catch (error) {
    return res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

exports.validate = async (req, res) => {
  const user = await User.findByPk(req.user.userId);
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    year: user.year,
    sem: user.sem,
    section: user.section,
    token: req.headers.authorization.slice(7),
    message: "Token is valid",
  });
};
