import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("recovery.db");
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'user',
    sober_start_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    mood INTEGER,
    urgeLevel INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    content TEXT,
    sentiment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Seed a default user if none exists
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  // Set sober start date to 12 days ago for demo
  const twelveDaysAgo = new Date();
  twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
  const isoDate = twelveDaysAgo.toISOString();
  const hashedPassword = bcrypt.hashSync("password123", 10);

  db.prepare("INSERT INTO users (email, password, name, role, sober_start_date) VALUES (?, ?, ?, ?, ?)").run("user@example.com", hashedPassword, "Recovery User", "user", isoDate);
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("admin@example.com", hashedPassword, "Admin User", "admin");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").run(email, hashedPassword, name);
      const newUser = db.prepare("SELECT id, email, name, role, sober_start_date FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
      const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET);
      res.json({ token, user: newUser });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  });

  // API Routes
  app.get("/api/user", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, email, name, role, sober_start_date FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.get("/api/stats", authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    const moods = db.prepare("SELECT * FROM moods WHERE userId = ? ORDER BY timestamp DESC LIMIT 30").all(userId);
    const journals = db.prepare("SELECT * FROM journals WHERE userId = ? ORDER BY timestamp DESC LIMIT 5").all(userId);
    res.json({ moods, journals });
  });

  app.post("/api/checkin", authenticateToken, (req: any, res) => {
    const { mood, urgeLevel } = req.body;
    const userId = req.user.id;
    db.prepare("INSERT INTO moods (userId, mood, urgeLevel) VALUES (?, ?, ?)").run(userId, mood, urgeLevel);
    res.json({ status: "success" });
  });

  app.post("/api/journal", authenticateToken, (req: any, res) => {
    const { content, sentiment } = req.body;
    const userId = req.user.id;
    db.prepare("INSERT INTO journals (userId, content, sentiment) VALUES (?, ?, ?)").run(userId, content, sentiment || "neutral");
    res.json({ status: "success" });
  });

  app.get("/api/plan", authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    const plan = db.prepare("SELECT * FROM plans WHERE userId = ? ORDER BY timestamp DESC LIMIT 1").get(userId) as any;
    res.json(plan || { content: JSON.stringify({ goals: [], triggers: [], coping: [] }) });
  });

  app.post("/api/plan", authenticateToken, (req: any, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    db.prepare("INSERT INTO plans (userId, content) VALUES (?, ?)").run(userId, JSON.stringify(content));
    res.json({ status: "success" });
  });

  // Admin Routes
  app.post("/api/admin/promote", authenticateToken, (req: any, res) => {
    const { password } = req.body;
    if (password === "admin123") {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(req.user.id);
      const user = db.prepare("SELECT id, email, name, role, sober_start_date FROM users WHERE id = ?").get(req.user.id);
      res.json({ status: "success", user });
    } else {
      res.status(401).json({ error: "Invalid admin password" });
    }
  });

  app.get("/api/admin/users", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id) as any;
    if (user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const users = db.prepare("SELECT id, email, name, role, sober_start_date FROM users").all();
    res.json(users);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
