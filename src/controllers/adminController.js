import User from "../models/User.js";
import bcrypt from "bcryptjs";

/**
 * ─────────────────────────────────────────
 * ADMIN REGISTRATION
 * POST /api/admin/register
 * ─────────────────────────────────────────
 * Registers a new admin user.
 * In production: protect this with a secret key or invite system.
 *
 * TODO (your logic):
 * 1. Validate req.body (username, email, password)
 * 2. Check that no user with that email already exists
 * 3. Hash the password with bcrypt
 * 4. Create user with role: "admin"
 * 5. Return 201 + the new user (no password in response)
 */
export const registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already in use." });

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
    username,
    email,
    password: hashedPassword,
    role: "admin",
    });

   const { password: _, ...adminData } = admin.toObject();
 return res.status(201).json({ message: "Admin registered.", user: adminData });

    res.status(200).json({ message: "registerAdmin boilerplate hit." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ─────────────────────────────────────────
 * GET STATS
 * GET /api/admin/stats
 * ─────────────────────────────────────────
 * Returns counts for: total users, online users, offline users.
 * Relies on the isOnline field already in your User model.
 *
 * TODO (your logic):
 * 1. Count all users (totalUsers)
 * 2. Count where isOnline === true (onlineUsers)
 * 3. Offline = total - online
 * 4. Optionally: count new signups today (createdAt >= start of today)
 */
export const getAdminStats = async (req, res) => {
  try {
     const totalUsers = await User.countDocuments();gk/md
     const onlineUsers = await User.countDocuments({ isOnline: true });
      const offlineUsers = totalUsers - onlineUsers;

    // const startOfToday = new Date();
    // startOfToday.setHours(0, 0, 0, 0);
    // const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfToday } });

    res.status(200).json({
      // totalUsers,
      // onlineUsers,
      // offlineUsers,
      // newUsersToday,
      message: "getAdminStats boilerplate hit.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ─────────────────────────────────────────
 * GET ALL USERS
 * GET /api/admin/users
 * ─────────────────────────────────────────
 * Returns a paginated list of all registered users.
 * Optional query params: ?page=1&limit=20&search=keyword
 *
 * TODO (your logic):
 * 1. Parse page, limit, search from req.query
 * 2. Build a search filter (username or email regex)
 * 3. Query User.find() with filter, skip, limit
 * 4. Return users array + total count for pagination
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    // const filter = search
    //   ? { $or: [{ username: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
    //   : {};

    // const users = await User.find(filter)
    //   .select("-password")
    //   .sort({ createdAt: -1 })
    //   .skip((page - 1) * limit)
    //   .limit(Number(limit));

    // const total = await User.countDocuments(filter);

    // return res.status(200).json({ users, total, page: Number(page), limit: Number(limit) });

    res.status(200).json({ message: "getAllUsers boilerplate hit." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ─────────────────────────────────────────
 * GET SINGLE USER
 * GET /api/admin/users/:id
 * ─────────────────────────────────────────
 * Returns one user's full profile (no password).
 *
 * TODO (your logic):
 * 1. Find user by req.params.id
 * 2. Return 404 if not found
 * 3. Return the user object (minus password)
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // const user = await User.findById(id).select("-password");
    // if (!user) return res.status(404).json({ message: "User not found." });
    // return res.status(200).json(user);

    res.status(200).json({ message: `getUserById boilerplate hit. id: ${id}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ─────────────────────────────────────────
 * CREATE USER (admin-side)
 * POST /api/admin/users
 * ─────────────────────────────────────────
 * Admin manually creates a user account.
 *
 * TODO (your logic):
 * 1. Validate required fields from req.body
 * 2. Check for duplicate email
 * 3. Hash password, set role (default: "user")
 * 4. Create and return the new user
 */
export const createUser = async (req, res) => {
  try {
    const { username, email, password, role = "user" } = req.body;

    // const existingUser = await User.findOne({ email });
    // if (existingUser) return res.status(400).json({ message: "Email already in use." });

    // const hashedPassword = await bcrypt.hash(password, 12);
    // const user = await User.create({ username, email, password: hashedPassword, role });

    // const { password: _, ...userData } = user.toObject();
    // return res.status(201).json({ message: "User created.", user: userData });

    res.status(200).json({ message: "createUser boilerplate hit." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ─────────────────────────────────────────
 * UPDATE USER
 * PUT /api/admin/users/:id
 * ─────────────────────────────────────────
 * Admin edits a user's profile fields.
 * Password changes handled separately (optional).
 *
 * TODO (your logic):
 * 1. Get id from req.params, fields from req.body
 * 2. Prevent updating password here (keep that separate)
 * 3. Find and update with { new: true, runValidators: true }
 * 4. Return updated user
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updateFields } = req.body; // strip password

    // const updatedUser = await User.findByIdAndUpdate(
    //   id,
    //   { $set: updateFields },
    //   { new: true, runValidators: true }
    // ).select("-password");

    // if (!updatedUser) return res.status(404).json({ message: "User not found." });
    // return res.status(200).json({ message: "User updated.", user: updatedUser });

    res.status(200).json({ message: `updateUser boilerplate hit. id: ${id}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ─────────────────────────────────────────
 * DELETE USER
 * DELETE /api/admin/users/:id
 * ─────────────────────────────────────────
 * Admin permanently deletes a user.
 * Consider: soft delete (isDeleted flag) vs hard delete.
 *
 * TODO (your logic):
 * 1. Find user by id, return 404 if missing
 * 2. Optional: prevent deleting yourself (req.adminUser._id !== id check)
 * 3. Delete the user
 * 4. Return success message
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Guard: admin cannot delete their own account from the dashboard
    // if (req.adminUser._id.toString() === id) {
    //   return res.status(403).json({ message: "You cannot delete your own admin account." });
    // }

    // const deletedUser = await User.findByIdAndDelete(id);
    // if (!deletedUser) return res.status(404).json({ message: "User not found." });
    // return res.status(200).json({ message: "User deleted." });

    res.status(200).json({ message: `deleteUser boilerplate hit. id: ${id}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
