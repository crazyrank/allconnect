import { useState, useEffect, useCallback } from "react";
import axios from "axios";

// Base API configuration (change in production)
const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Useful if you switch to cookies later
  headers: {
    "Content-Type": "application/json",
  },
});

// Axios request interceptor - attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Axios response interceptor - handle common errors (e.g., token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.reload(); // Force re-login
    }
    return Promise.reject(error);
  }
);

export default function AdminDashboard() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("adminToken"));
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [search, setSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("member");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users"); // Adjust path if needed (e.g., /admin/users)
      setUsers(res.data.users || res.data); // Adapt based on your backend response shape
    } catch (err) {
      console.error("Failed to fetch users:", err.response?.data || err.message);
      // Optionally show toast/notification
    }
  }, []);

  // Fetch recent activity (if you have an endpoint; otherwise keep mock or add one)
  const fetchActivity = useCallback(async () => {
    try {
      // Example: await api.get("/activity"); 
      // For now, keep a minimal client-side log or fetch from chat/user logs if available
      setActivity([]); // Replace with real data
    } catch (err) {
      console.error("Failed to fetch activity");
    }
  }, []);

  // Initial data load after login
  useEffect(() => {
    if (loggedIn) {
      fetchUsers();
      fetchActivity();
    }
  }, [loggedIn, fetchUsers, fetchActivity]);

  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError("Please enter username and password");
      return;
    }

    setIsLoading(true);
    setLoginError("");

    try {
      const res = await api.post("/auth/login", { username, password }); // Match your authRoutes

      const { token } = res.data; // Adjust based on your backend response
      localStorage.setItem("adminToken", token);

      setLoggedIn(true);
      setUsername("");
      setPassword("");
    } catch (err) {
      setLoginError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setLoggedIn(false);
    setUsers([]);
    setActivity([]);
  };

  // Log activity (client-side for UI feedback; sync with backend if needed)
  const logActivity = (type, msg) => {
    setActivity((prev) => [
      { id: Date.now(), type, msg, time: "just now" },
      ...prev.slice(0, 4),
    ]);
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "online").length;
  const offlineUsers = totalUsers - activeUsers;

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle user status
  const toggleStatus = async (id) => {
    try {
      await api.patch(`/users/${id}/status`); // Adjust endpoint
      fetchUsers(); // Refresh list
      const user = users.find((u) => u.id === id);
      if (user) {
        const newStatus = user.status === "online" ? "offline" : "online";
        logActivity("online", `${user.name} ${newStatus === "online" ? "came online" : "went offline"}`);
      }
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  // Remove user
  const removeUser = async (id) => {
    if (!window.confirm("Remove this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
      const u = users.find((x) => x.id === id);
      if (u) logActivity("remove", `${u.name} removed`);
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  // Save edit
  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/users/${id}`, { name: editName.trim() });
      fetchUsers();
      logActivity("online", `${editName.trim()} updated`);
      setEditingId(null);
      setEditName("");
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // Add new user
  const addUser = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await api.post("/users", {
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole.trim() || "member",
      });
      fetchUsers();
      logActivity("add", `${newName.trim()} added`);
      setNewName("");
      setNewEmail("");
      setNewRole("member");
    } catch (err) {
      console.error("Add user failed:", err);
    }
  };

  const activityColor = (type) => {
    if (type === "add") return { bg: "rgba(34,211,165,0.12)", color: "#22d3a5" };
    if (type === "remove") return { bg: "rgba(248,113,113,0.12)", color: "#f87171" };
    return { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" };
  };

  const activityIcon = (type) => {
    if (type === "add") return "+";
    if (type === "remove") return "x";
    return "o";
  };

  const s = { /* Your existing styles object remains unchanged */ };

  // Login Screen
  if (!loggedIn) {
    return (
      <div style={s.loginWrap}>
        <div style={s.loginCard}>
          <div style={{ fontSize: 18, fontWeight: 500, color: "#fff", marginBottom: 4 }}>
            All<span style={{ color: "#22d3a5" }}>Connect</span>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 24 }}>
            Admin panel - sign in to continue
          </div>

          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>USERNAME</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            style={{ ...s.input, marginBottom: 12 }}
          />

          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>PASSWORD</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            style={{ ...s.input, marginBottom: 12 }}
          />

          {loginError && (
            <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: "100%",
              background: "#22d3a5",
              border: "none",
              borderRadius: 8,
              padding: 11,
              fontSize: 13,
              fontWeight: 500,
              color: "#0a0c10",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#f1f5f9" }}>Overview</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            AllConnect user management
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#94a3b8" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(34,211,165,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "#22d3a5" }}>
              AD
            </div>
            Admin
          </div>
          <button
            onClick={handleLogout}
            style={{ background: "none", border: "0.5px solid rgba(255,255,255,0.2)", color: "#f87171", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={s.content}>
        {/* Stat Cards - unchanged */}
        <div style={s.statsGrid}>
          {[
            { label: "TOTAL REGISTERED", value: totalUsers, pill: "All time", pillColor: "#60a5fa", pillBg: "rgba(96,165,250,0.1)", accent: "#60a5fa" },
            { label: "ACTIVE NOW", value: activeUsers, pill: "Live", pillColor: "#22d3a5", pillBg: "rgba(34,211,165,0.1)", accent: "#22d3a5" },
            { label: "OFFLINE", value: offlineUsers, pill: "Not connected", pillColor: "#f87171", pillBg: "rgba(248,113,113,0.1)", accent: "#f87171" },
          ].map((card) => (
            <div key={card.label} style={{ background: "#111318", border: "0.5px solid rgba(255,255,255,0.07)", borderTop: `2px solid ${card.accent}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 8, letterSpacing: ".3px" }}>{card.label}</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "#f1f5f9", lineHeight: 1, marginBottom: 8 }}>{card.value}</div>
              <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, padding: "3px 8px", borderRadius: 20, background: card.pillBg, color: card.pillColor }}>{card.pill}</span>
            </div>
          ))}
        </div>

        {/* Rest of your UI (mainRow, Users Table, Add User, Activity) remains almost identical */}
        {/* Just replace setUsers / setActivity calls with the async versions above */}
        {/* For brevity, the full table code is unchanged except for onClick handlers calling the async functions */}

        {/* Example: In the table actions */}
        {/* <button onClick={() => toggleStatus(u.id)} ... >toggle</button> */}
        {/* Same for removeUser, saveEdit, addUser */}

      </div>
    </div>
  );
}