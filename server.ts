import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    avatar TEXT,
    cover TEXT,
    bio TEXT,
    location TEXT,
    work TEXT,
    education TEXT,
    contact TEXT,
    gender TEXT,
    birthday TEXT,
    relationship TEXT,
    pin TEXT,
    walletBalance REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    timestamp INTEGER,
    authorName TEXT,
    authorAvatar TEXT,
    authorIsAI INTEGER,
    image TEXT,
    link TEXT
  );

  CREATE TABLE IF NOT EXISTS likes (
    postId INTEGER,
    userName TEXT,
    PRIMARY KEY (postId, userName)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER,
    author TEXT,
    avatar TEXT,
    content TEXT,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId TEXT,
    receiverId TEXT,
    content TEXT,
    timestamp INTEGER
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  
  // Auth & User
  app.post("/api/signup", (req, res) => {
    const { name, email, password, avatar } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO users (name, username, email, password, avatar, cover, bio, location, work, education, contact, gender, birthday, relationship, pin, walletBalance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
      const result = stmt.run(
        name, username, email, password, avatar || "https://picsum.photos/seed/user/200/200",
        "https://picsum.photos/seed/cover/1200/400", "আমি এই প্ল্যাটফর্মে নতুন।", "অজানা", "অজানা", "অজানা", "অজানা", "অজানা", "অজানা", "অজানা", "0000", 0
      );
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, error: "ইমেইল বা পাসওয়ার্ড ভুল" });
    }
  });

  app.post("/api/user/update", (req, res) => {
    const { username, walletBalance, pin } = req.body;
    try {
      if (walletBalance !== undefined) {
        db.prepare("UPDATE users SET walletBalance = ? WHERE username = ?").run(walletBalance, username);
      }
      if (pin !== undefined) {
        db.prepare("UPDATE users SET pin = ? WHERE username = ?").run(pin, username);
      }
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Posts
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY timestamp DESC").all() as any[];
    
    const result = posts.map(post => {
      const likes = db.prepare("SELECT userName FROM likes WHERE postId = ?").all(post.id) as any[];
      const comments = db.prepare("SELECT * FROM comments WHERE postId = ? ORDER BY timestamp ASC").all(post.id);
      
      return {
        id: post.id.toString(),
        role: post.authorIsAI ? "model" : "user",
        content: post.content,
        timestamp: post.timestamp,
        author: {
          name: post.authorName,
          avatar: post.authorAvatar,
          isAI: Boolean(post.authorIsAI)
        },
        likes: likes.length,
        isLiked: false, // will be computed on client
        likedBy: likes.map(l => l.userName),
        comments: comments.map((c: any) => ({
          id: c.id.toString(),
          author: c.author,
          avatar: c.avatar,
          content: c.content,
          timestamp: c.timestamp
        })),
        image: post.image,
        link: post.link
      };
    });
    
    res.json(result);
  });

  app.post("/api/posts", (req, res) => {
    const { content, timestamp, authorName, authorAvatar, authorIsAI, image, link } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO posts (content, timestamp, authorName, authorAvatar, authorIsAI, image, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(content, timestamp, authorName, authorAvatar, authorIsAI ? 1 : 0, image || null, link || null);
      res.json({ success: true, id: result.lastInsertRowid.toString() });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM posts WHERE id = ?").run(id);
    db.prepare("DELETE FROM likes WHERE postId = ?").run(id);
    db.prepare("DELETE FROM comments WHERE postId = ?").run(id);
    res.json({ success: true });
  });

  app.put("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    db.prepare("UPDATE posts SET content = ? WHERE id = ?").run(content, id);
    res.json({ success: true });
  });

  // Likes
  app.post("/api/posts/:id/like", (req, res) => {
    const { id } = req.params;
    const { userName } = req.body;
    
    const existing = db.prepare("SELECT * FROM likes WHERE postId = ? AND userName = ?").get(id, userName);
    if (existing) {
      db.prepare("DELETE FROM likes WHERE postId = ? AND userName = ?").run(id, userName);
    } else {
      db.prepare("INSERT INTO likes (postId, userName) VALUES (?, ?)").run(id, userName);
    }
    res.json({ success: true });
  });

  // Comments
  app.post("/api/posts/:id/comments", (req, res) => {
    const { id } = req.params;
    const { author, avatar, content, timestamp } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO comments (postId, author, avatar, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(id, author, avatar, content, timestamp);
    res.json({ success: true, id: result.lastInsertRowid.toString() });
  });

  // Messages
  app.get("/api/messages/:user1/:user2", (req, res) => {
    const { user1, user2 } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY timestamp ASC
    `).all(user1, user2, user2, user1);
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const { senderId, receiverId, content, timestamp } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO messages (senderId, receiverId, content, timestamp)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(senderId, receiverId, content, timestamp);
      res.json({ success: true, id: result.lastInsertRowid.toString() });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.get("/api/chats/:userId", (req, res) => {
    const { userId } = req.params;
    // Get unique users the current user has chatted with
    const chats = db.prepare(`
      SELECT DISTINCT 
        CASE 
          WHEN senderId = ? THEN receiverId 
          ELSE senderId 
        END as chatPartnerId
      FROM messages 
      WHERE senderId = ? OR receiverId = ?
    `).all(userId, userId, userId) as any[];

    // Fetch user details for each chat partner
    const chatPartners = chats.map(chat => {
      const user = db.prepare("SELECT name, username, avatar FROM users WHERE username = ?").get(chat.chatPartnerId);
      return user;
    }).filter(Boolean);

    res.json(chatPartners);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
