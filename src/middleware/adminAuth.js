import jwt from "jsonwebtoken";
import User from "../models/User.js";

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.adminToken || req.headers.authorization?.split(" ")[1];
    if (!token) {

      return res.status(401).json({ message: "No token. Access denied." });
    }

    // --- STEP 2: Verify token ---
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // --- STEP 3: Find user ---
    const user = await User.findById(decoded.id).select("-password");


    // --- STEP 4: Check admin role ---
   if (!user || user.role !== "admin") {
  return res.status(403).json({ message: "Forbidden. Admins only." });
   }

    // --- STEP 5: Attach and proceed ---
    req.adminUser = user;
  next();

    next();  
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

export default adminAuth;
