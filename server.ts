import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("amarsite.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    avatar TEXT,
    wallet_balance REAL DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_username TEXT,
    content TEXT,
    image TEXT,
    likes INTEGER DEFAULT 0,
    timestamp INTEGER,
    FOREIGN KEY(author_username) REFERENCES users(username)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    author_username TEXT,
    text TEXT,
    timestamp INTEGER,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(author_username) REFERENCES users(username)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { name, username, email, password } = req.body;
    try {
      const avatar = `https://picsum.photos/seed/${username}/100/100`;
      const stmt = db.prepare("INSERT INTO users (name, username, email, password, avatar) VALUES (?, ?, ?, ?, ?)");
      stmt.run(name, username.toLowerCase(), email, password, avatar);
      
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.toLowerCase());
      res.json({ success: true, user: { ...user, isLoggedIn: true } });
    } catch (error) {
      res.status(400).json({ success: false, message: "Username or Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ success: true, user: { ...user, isLoggedIn: true } });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Post Routes
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT p.*, u.name as author_name, u.avatar as author_avatar 
      FROM posts p 
      JOIN users u ON p.author_username = u.username 
      ORDER BY p.timestamp DESC
    `).all();

    const formattedPosts = posts.map((p: any) => ({
      id: p.id.toString(),
      author: {
        name: p.author_name,
        username: p.author_username,
        avatar: p.author_avatar,
        isAI: p.author_username === 'ai_bot'
      },
      content: p.content,
      image: p.image,
      likes: p.likes,
      isLiked: false,
      timestamp: p.timestamp,
      comments: db.prepare("SELECT c.*, u.name as author_name, u.avatar as author_avatar FROM comments c JOIN users u ON c.author_username = u.username WHERE post_id = ?").all(p.id).map((c: any) => ({
        id: c.id.toString(),
        author: { name: c.author_name, username: c.author_username, avatar: c.author_avatar },
        text: c.text,
        timestamp: c.timestamp,
        replies: []
      }))
    }));

    res.json(formattedPosts);
  });

  app.post("/api/posts", (req, res) => {
    const { author_username, content, image } = req.body;
    const timestamp = Date.now();
    const stmt = db.prepare("INSERT INTO posts (author_username, content, image, timestamp) VALUES (?, ?, ?, ?)");
    const info = stmt.run(author_username, content, image, timestamp);
    
    // Reward user
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + 0.10 WHERE username = ?").run(author_username);

    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.post("/api/posts/:id/comment", (req, res) => {
    const { id } = req.params;
    const { author_username, text } = req.body;
    const timestamp = Date.now();
    const stmt = db.prepare("INSERT INTO comments (post_id, author_username, text, timestamp) VALUES (?, ?, ?, ?)");
    stmt.run(id, author_username, text, timestamp);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // AI Assistant Automatic Posting (Server-side)
  const AI_BOT_USERNAME = 'ai_bot';
  
  // Ensure AI bot exists
  try {
    db.prepare("INSERT OR IGNORE INTO users (name, username, email, password, avatar, is_verified) VALUES (?, ?, ?, ?, ?, ?)")
      .run("AI Assistant", AI_BOT_USERNAME, "ai@amarsite.com", "bot-password", "https://picsum.photos/seed/bot/100/100", 1);
  } catch (e) {}

  setInterval(async () => {
    try {
      // In a real app, you'd call Gemini here. For now, we'll simulate or use a simple message.
      const messages = [
        "আজকের দিনটি চমৎকার! আপনারাও কি তাই মনে করেন? 😊",
        "Amarsite-এ নতুন ফিচার আসছে খুব শীঘ্রই। সাথেই থাকুন! 🚀",
        "সফলতা মানেই কঠোর পরিশ্রম আর ধৈর্য। এগিয়ে যান! 💪",
        "আপনার চিন্তা শেয়ার করুন এবং অন্যদের অনুপ্রাণিত করুন। ✨"
      ];
      const content = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = Date.now();
      db.prepare("INSERT INTO posts (author_username, content, timestamp) VALUES (?, ?, ?)")
        .run(AI_BOT_USERNAME, content, timestamp);
      console.log("AI Assistant posted successfully");
    } catch (err) {
      console.error("AI Assistant posting failed:", err);
    }
  }, 300000); // Every 5 minutes
}

startServer();
