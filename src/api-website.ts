import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const SECRET_KEY = process.env.JWT_SECRET || "super-secret-key-for-dev";

// Initialize Firebase Admin lazily in the route, or centrally here if possible
try {
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "ministylecards-web"
    });
  }
} catch (e) {
  console.log("Firebase admin initialization error:", e);
}

// Middleware to authenticate website users
const authenticateWebsiteUser = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err || !user.isWebsiteUser) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

export async function setupWebsiteTables(db: any) {
  // Products, Categories, Collections
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS website_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      cover_image TEXT
    );
    CREATE TABLE IF NOT EXISTS website_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      base_price INTEGER NOT NULL,
      category_id INTEGER,
      collection_id INTEGER,
      images TEXT, -- JSON array of URLs
      variants TEXT, -- JSON of paper, thickness, addons, etc.
      is_active INTEGER DEFAULT 1,
      seo_title TEXT,
      seo_description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS website_addon_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      input_type TEXT NOT NULL DEFAULT 'select',
      options TEXT,
      is_default_for_invitation INTEGER DEFAULT 0
    );
  `);

  // Users & Auth
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      address TEXT,
      wedding_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Cart & Favorites
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_favorites (
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS website_carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS website_cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      config TEXT -- JSON string for selected variants
    );
  `);

  // Orders
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      total_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending_payment', -- pending_payment, paid, processing, shipped, completed, cancelled
      shipping_info TEXT, -- JSON of name, phone, address
      coupon_code TEXT,
      discount_amount INTEGER DEFAULT 0,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS website_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      config TEXT -- JSON string for selected variants
    );
  `);
  
  try { await db.exec("ALTER TABLE website_orders ADD COLUMN rec_trade_id TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_orders ADD COLUMN bank_transaction_id TEXT;"); } catch(e) {}

  // Contacts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      is_handled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Journal/Posts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      content TEXT,
      feature_image TEXT,
      seo_title TEXT,
      seo_description TEXT,
      is_published INTEGER DEFAULT 0,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  try { await db.exec("ALTER TABLE website_collections ADD COLUMN slug TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN sort_order INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN slug TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN seo_title TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN seo_description TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN shipping_fee INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_categories ADD COLUMN is_wedding_invitation INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN is_wedding_invitation INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_posts ADD COLUMN tags TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_posts ADD COLUMN seo_title TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_posts ADD COLUMN seo_description TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN pricing_rule_id INTEGER;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_pricing_rules ADD COLUMN shipping_fee_per_box INTEGER;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_pricing_rules ADD COLUMN items_per_box INTEGER;"); } catch(e) {}
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_pricing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      tiers_json TEXT NOT NULL,
      notes TEXT
    );
  `);
  
  try { await db.exec("ALTER TABLE website_addon_groups ADD COLUMN display_group TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_collections ADD COLUMN cover_image_alt TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_collections ADD COLUMN is_active INTEGER DEFAULT 1;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_collections ADD COLUMN sort_order INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_posts ADD COLUMN feature_image_alt TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN image_alts TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_addon_groups ADD COLUMN max_selections INTEGER DEFAULT 0;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN inclusions TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN min_qty INTEGER DEFAULT 1;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN product_type TEXT DEFAULT 'standard';"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN image_loop_count INTEGER;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_products ADD COLUMN image_loop_var TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_orders ADD COLUMN rec_trade_id TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_orders ADD COLUMN bank_transaction_id TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_orders ADD COLUMN payment_error TEXT;"); } catch(e) {}
  try { await db.exec("ALTER TABLE website_orders ADD COLUMN receipt_file_base64 TEXT;"); } catch(e) {}
}

import { GoogleGenAI } from "@google/genai";

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export function mountWebsiteApi(app: express.Express, db: any, authenticateAdmin: any) {
  // Translate to slug API
  app.post("/api/admin/website/translate-slug", authenticateAdmin, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.json({ slug: "" });
      
      let slug = "";
      try {
        if (process.env.GEMINI_API_KEY && ai) {
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Translate the following Traditional Chinese title to English, and convert it into a URL-friendly slug (lowercase, words separated by hyphens). Do not return any other text or explanation, just the slug itself.\n\nTitle: ${text}`,
            config: {
              temperature: 0.1
            }
          });
          slug = response.text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
      } catch (aiError: any) {
        console.error("AI translation failed, using fallback:", aiError.message);
      }

      if (!slug) {
        // Fallback: Use standard base36 random string or just basic processing
        const fallbackStr = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        slug = fallbackStr || `item-${Date.now().toString(36)}`;
      }
      
      res.json({ slug });
    } catch (error: any) {
      console.error("Translate slug error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 1. Products & Categories
  // ==========================================
  app.get("/api/products", async (req, res) => {
    try {
      const { category_id, collection_id, search, limit = 20, offset = 0 } = req.query;
      
      let query = "SELECT * FROM website_products WHERE is_active = 1";
      const params: any[] = [];
      
      if (category_id) {
        query += " AND category_id = ?";
        params.push(Number(category_id));
      }
      if (collection_id) {
        query += " AND collection_id = ?";
        params.push(Number(collection_id));
      }
      if (search) {
        query += " AND title LIKE ?";
        params.push(`%${search}%`);
      }
      
      query += " ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?";
      params.push(Number(limit), Number(offset));
      
      const products = await db.prepare(query).all(...params);
      
      // Parse JSON fields
      const parsedProducts = products.map((p: any) => ({
        ...p,
        images: p.images ? JSON.parse(p.images) : [],
        image_alts: p.image_alts ? JSON.parse(p.image_alts) : [],
        variants: p.variants ? JSON.parse(p.variants) : {}
      }));
      
      res.json(parsedProducts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:idOrSlug", async (req, res) => {
    try {
      const { idOrSlug } = req.params;
      
      let product;
      if (!isNaN(Number(idOrSlug))) {
        product = await db.prepare("SELECT * FROM website_products WHERE id = ?").get(idOrSlug);
      } else {
        product = await db.prepare("SELECT * FROM website_products WHERE slug = ?").get(idOrSlug);
      }
      
      if (!product) return res.status(404).json({ error: "Product not found" });
      
      product.images = product.images ? JSON.parse(product.images) : [];
      let variantsData = product.variants ? JSON.parse(product.variants) : {};
      product.variants = Array.isArray(variantsData) ? { items: variantsData, addon_group_ids: []} : (variantsData || { items: [], addon_group_ids: [] });
      product.inclusions = product.inclusions ? JSON.parse(product.inclusions) : [];
      
      // Load pricing rule if exists
      if (product.pricing_rule_id) {
        const pRule = await db.prepare("SELECT * FROM website_pricing_rules WHERE id = ?").get(product.pricing_rule_id);
        if (pRule) {
           product.pricing_rule = {
             ...pRule,
             tiers: pRule.tiers_json ? JSON.parse(pRule.tiers_json) : []
           };
        }
      }
      
      if (product.variants && Array.isArray(product.variants.addon_group_ids) && product.variants.addon_group_ids.length > 0) {
        const ids = product.variants.addon_group_ids;
        const placeHolders = ids.map(() => '?').join(',');
        const groups = await db.prepare(`SELECT * FROM website_addon_groups WHERE id IN (${placeHolders})`).all(...ids);
        product.addon_groups = groups.map((g: any) => ({
          ...g,
          options: g.options ? JSON.parse(g.options) : [],
          is_default_for_invitation: !!g.is_default_for_invitation
        }));
      } else {
        product.addon_groups = [];
      }

      // Get category to determine if it's a wedding invitation
      const category = await db.prepare("SELECT * FROM website_categories WHERE id = ?").get(product.category_id);
      product.category = category;
      product.is_wedding_invitation = product.is_wedding_invitation === 1 || (category && category.is_wedding_invitation === 1) || (category && category.slug === 'wedding-invitations');
      
      // Get related products simply by same category
      const related = await db.prepare("SELECT * FROM website_products WHERE category_id = ? AND id != ? LIMIT 4").all(product.category_id, product.id);
      product.related = related.map((r: any) => ({ ...r, images: r.images ? JSON.parse(r.images) : [], image_alts: r.image_alts ? JSON.parse(r.image_alts) : [] }));
      
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await db.prepare("SELECT * FROM website_categories").all();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/collections", async (req, res) => {
    try {
      const collections = await db.prepare("SELECT * FROM website_collections WHERE is_active = 1 ORDER BY sort_order ASC, id DESC").all();
      res.json(collections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/addon_groups", async (req, res) => {
    try {
      const groups = await db.prepare("SELECT * FROM website_addon_groups").all();
      res.json(groups.map((g: any) => ({
        ...g,
        options: g.options ? JSON.parse(g.options) : [],
        is_default_for_invitation: !!g.is_default_for_invitation
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/collections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const isConfigParamNumeric = /^\d+$/.test(id);
      
      let collection;
      if (isConfigParamNumeric) {
         collection = await db.prepare("SELECT * FROM website_collections WHERE id = ? AND is_active = 1").get(id);
      } else {
         collection = await db.prepare("SELECT * FROM website_collections WHERE slug = ? AND is_active = 1").get(id);
      }
      
      if (!collection) return res.status(404).json({ error: "Collection not found" });
      
      const products = await db.prepare("SELECT * FROM website_products WHERE collection_id = ? AND is_active = 1 ORDER BY sort_order ASC, id DESC").all(collection.id);
      collection.products = products.map((p: any) => ({
        ...p,
        images: p.images ? JSON.parse(p.images) : [],
        image_alts: p.image_alts ? JSON.parse(p.image_alts) : []
      }));
      
      res.json(collection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 2. User & Authentication
  // ==========================================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, phone, address, wedding_date } = req.body;
      
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
      
      const existing = await db.prepare("SELECT id FROM website_users WHERE email = ?").get(email);
      if (existing) return res.status(400).json({ error: "Email already exists" });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await db.prepare(
        "INSERT INTO website_users (email, password, name, phone, address, wedding_date) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(email, hashedPassword, name, phone, address, wedding_date);
      
      const token = jwt.sign({ id: result.lastInsertRowid, email, isWebsiteUser: true }, SECRET_KEY, { expiresIn: "7d" });
      
      res.json({ success: true, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.prepare("SELECT * FROM website_users WHERE email = ?").get(email);
      
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      
      const token = jwt.sign({ id: user.id, email: user.email, isWebsiteUser: true }, SECRET_KEY, { expiresIn: "7d" });
      delete user.password;
      
      res.json({ success: true, token, user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/firebase-login", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: "Firebase token is required" });

      if (getApps().length === 0) {
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "ministylecards-web"
        });
      }

      // 驗證 Firebase Token
      const decodedToken = await getAuth().verifyIdToken(token);
      const email = decodedToken.email;
      
      if (!email) {
          return res.status(400).json({ error: "Firebase token does not contain an email" });
      }

      let user = await db.prepare("SELECT * FROM website_users WHERE email = ?").get(email);
      
      // 如果 email 不存在：建立會員
      if (!user) {
         // 生成隨機密碼 (因為他們透過 Firebase 登入)
         const randomPassword = require('crypto').randomBytes(16).toString('hex');
         const hashedPassword = await bcrypt.hash(randomPassword, 10);
         
         const name = decodedToken.name || email.split('@')[0];
         const result = await db.prepare(
           "INSERT INTO website_users (email, password, name, phone, address, wedding_date) VALUES (?, ?, ?, ?, ?, ?)"
         ).run(email, hashedPassword, name, '', '', '');
         
         user = { id: result.lastInsertRowid, email: email, name: name, phone: '', address: '', wedding_date: '' };
      } else {
         delete user.password;
      }

      // 回傳 website_token
      const website_token = jwt.sign({ id: user.id, email: user.email, isWebsiteUser: true }, SECRET_KEY, { expiresIn: "7d" });
      
      res.json({ success: true, token: website_token, user });
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      res.status(401).json({ error: "登入失敗: " + error.message });
    }
  });

  app.get("/api/user/profile", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const user = await db.prepare("SELECT id, email, name, phone, address, wedding_date, created_at FROM website_users WHERE id = ?").get(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/user/profile", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const { name, phone, address, wedding_date } = req.body;
      await db.prepare(
        "UPDATE website_users SET name = ?, phone = ?, address = ?, wedding_date = ? WHERE id = ?"
      ).run(name, phone, address, wedding_date, req.user.id);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 3. Cart & Favorites
  // ==========================================
  app.get("/api/cart", authenticateWebsiteUser, async (req: any, res) => {
    try {
      let cart = await db.prepare("SELECT * FROM website_carts WHERE user_id = ?").get(req.user.id);
      if (!cart) {
        const result = await db.prepare("INSERT INTO website_carts (user_id) VALUES (?)").run(req.user.id);
        cart = { id: result.lastInsertRowid, user_id: req.user.id };
      }
      
      const items = await db.prepare("SELECT * FROM website_cart_items WHERE cart_id = ?").all(cart.id);
      const parsedItems = items.map((i: any) => ({ ...i, config: i.config ? JSON.parse(i.config) : {} }));
      
      res.json({ ...cart, items: parsedItems });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cart/items", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const { product_id, quantity, config } = req.body;
      let cart = await db.prepare("SELECT id FROM website_carts WHERE user_id = ?").get(req.user.id);
      if (!cart) {
        const result = await db.prepare("INSERT INTO website_carts (user_id) VALUES (?)").run(req.user.id);
        cart = { id: result.lastInsertRowid };
      }
      
      // Could check if identical item exists and increment, but config makes it complex
      // Just insert as new item for now
      await db.prepare(
        "INSERT INTO website_cart_items (cart_id, product_id, quantity, config) VALUES (?, ?, ?, ?)"
      ).run(cart.id, product_id, quantity, JSON.stringify(config || {}));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.put("/api/cart/items/:itemId", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const { quantity, config } = req.body;
      
      await db.prepare("UPDATE website_cart_items SET quantity = ?, config = ? WHERE id = ?").run(
        quantity, JSON.stringify(config || {}), itemId
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/cart/items/:itemId", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      await db.prepare("DELETE FROM website_cart_items WHERE id = ?").run(itemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/favorites", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const favorites = await db.prepare(`
        SELECT p.* FROM website_products p
        JOIN website_favorites f ON p.id = f.product_id
        WHERE f.user_id = ?
      `).all(req.user.id);
      
      res.json(favorites.map((p: any) => ({
        ...p, images: p.images ? JSON.parse(p.images) : [], image_alts: p.image_alts ? JSON.parse(p.image_alts) : []
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/favorites/:productId", authenticateWebsiteUser, async (req: any, res) => {
    try {
      await db.prepare("INSERT OR IGNORE INTO website_favorites (user_id, product_id) VALUES (?, ?)").run(req.user.id, req.params.productId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/favorites/:productId", authenticateWebsiteUser, async (req: any, res) => {
    try {
      await db.prepare("DELETE FROM website_favorites WHERE user_id = ? AND product_id = ?").run(req.user.id, req.params.productId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 4. Orders & Payments
  // ==========================================
  app.get("/api/orders", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const orders = await db.prepare("SELECT * FROM website_orders WHERE user_id = ? ORDER BY id DESC").all(req.user.id);
      res.json(orders.map((o: any) => ({ ...o, shipping_info: o.shipping_info ? JSON.parse(o.shipping_info) : {} })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", authenticateWebsiteUser, async (req: any, res) => {
    try {
      // Modify to optionally accept items directly from request payload, or fallback to cart
      // We also accept total_amount if the frontend calculates it, for simplicity in this demo.
      const { shipping_info, coupon_code, payment_method, items: reqItems, total_amount: reqTotal, notes, receipt_file, prime } = req.body;
      
      let itemsToProcess = [];
      let totalAmount = 0;
      let cart = await db.prepare("SELECT id FROM website_carts WHERE user_id = ?").get(req.user.id);

      if (reqItems && Array.isArray(reqItems) && reqItems.length > 0) {
        // Frontend sends items directly
        itemsToProcess = reqItems.map(item => ({
             product_id: item.product_id,
             quantity: item.quantity || 1,
             config: typeof item.config === 'string' ? item.config : JSON.stringify(item.config || {}),
             clientPrice: item.price // If frontend sends derived price
        }));
        totalAmount = reqTotal || 0; // Accept frontend total for custom configs
        
        // Let's at least get the product price if totalAmount wasn't provided well
        if (!totalAmount) {
           for (const item of itemsToProcess) {
             const product = await db.prepare("SELECT base_price FROM website_products WHERE id = ?").get(item.product_id);
             const itemPrice = item.clientPrice || (product ? product.base_price : 0);
             totalAmount += itemPrice * item.quantity;
           }
        }
      } else {
        // Fallback to Server cart
        if (!cart) return res.status(400).json({ error: "Cart is empty" });
        const items = await db.prepare("SELECT * FROM website_cart_items WHERE cart_id = ?").all(cart.id);
        if (items.length === 0) return res.status(400).json({ error: "Cart is empty" });
        
        for (const item of items) {
          const product = await db.prepare("SELECT base_price FROM website_products WHERE id = ?").get(item.product_id);
          if (product) {
            const itemPrice = product.base_price; 
            totalAmount += itemPrice * item.quantity;
            itemsToProcess.push({ ...item, clientPrice: itemPrice });
          }
        }
      }

      const pdfDataStringToSave = req.body.receiptPdf || receipt_file || req.body.receipt_file || "";
      const base64DataToSave = pdfDataStringToSave.includes(',') ? pdfDataStringToSave.split(',')[1] : pdfDataStringToSave;

      // Create the order with pending_payment status FIRST
      const result = await db.prepare(
        "INSERT INTO website_orders (user_id, total_amount, shipping_info, coupon_code, payment_method, status, receipt_file_base64) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(req.user.id, totalAmount, JSON.stringify(shipping_info || {}), coupon_code, payment_method, 'pending_payment', base64DataToSave || null);
      
      const orderId = result.lastInsertRowid;
      
      // Update info like notes if column exists
      if (notes) {
         const newShippingInfo = { ...(shipping_info || {}), notes };
         await db.prepare("UPDATE website_orders SET shipping_info = ? WHERE id = ?").run(JSON.stringify(newShippingInfo), orderId);
      }
      
      // Insert items
      const insertItemStmt = db.prepare("INSERT INTO website_order_items (order_id, product_id, quantity, price, config) VALUES (?, ?, ?, ?, ?)");
      for (const item of itemsToProcess) {
        await insertItemStmt.run(orderId, item.product_id, item.quantity, item.clientPrice || 0, item.config);
      }
      
      // Clear cart
      if (cart && (!reqItems || reqItems.length === 0)) {
         await db.prepare("DELETE FROM website_cart_items WHERE cart_id = ?").run(cart.id);
      }

      // If Prime is provided, attempt TapPay payment
      if (prime) {
        const partnerKey = process.env.TAPPAY_PARTNER_KEY;
        const merchantId = process.env.TAPPAY_MERCHANT_ID;
        const isProd = process.env.TAPPAY_ENV === 'production';
        const tpUrl = isProd ? "https://prod.tappaysdk.com/tpc/payment/pay-by-prime" : "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime";

        if (!partnerKey || !merchantId) {
          console.warn("後端未設定金流對接資訊，跳過 TapPay 扣款，直接建立未付款訂單。");
        } else {
          const protocol = req.headers['x-forwarded-proto'] || req.protocol;
          const originUrl = req.headers.origin || `${protocol}://${req.get('host')}`;
          const backendUrl = process.env.WEBSITE_API_URL || `${protocol}://${req.get('host')}`;
          
          const tpResponse = await fetch(tpUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": partnerKey,
            },
            body: JSON.stringify({
              prime: prime,
              partner_key: partnerKey,
              merchant_id: merchantId,
              details: "Mini Style Cards Order #" + orderId,
              amount: totalAmount,
              three_domain_secure: true,
              result_url: {
                frontend_redirect_url: `${originUrl}/api/tappay/result?order_id=${orderId}`,
                backend_notify_url: `${backendUrl}/api/tappay/notify?order_id=${orderId}`
              },
              cardholder: {
                phone_number: shipping_info?.phone || "+886912345678",
                name: shipping_info?.name || req.user?.email.split('@')[0] || "Customer",
                email: req.user?.email || "info@ministylecards.com",
              },
              remember: false,
            }),
          });

          const tpData = await tpResponse.json();

          if (tpData.status === 0) {
            if (tpData.payment_url) {
              await db.prepare("UPDATE website_orders SET rec_trade_id = ? WHERE id = ?").run(tpData.rec_trade_id, orderId);
              return res.json({ success: true, payment_url: tpData.payment_url, orderId });
            }

            await db.prepare("UPDATE website_orders SET status = 'paid', rec_trade_id = ?, bank_transaction_id = ? WHERE id = ?").run(tpData.rec_trade_id || null, tpData.bank_transaction_id || null, orderId);

            // Send receipt PDF via email if provided
            const pdfDataString = req.body.receiptPdf || receipt_file || req.body.receipt_file;
            if (pdfDataString && process.env.RESEND_API_KEY) {
               try {
                   const base64Data = pdfDataString.includes(',') ? pdfDataString.split(',')[1] : pdfDataString;
                   const customerEmail = shipping_info?.email || req.user.email || 'support@ministylecards.com';
                   await fetch('https://api.resend.com/emails', {
                       method: 'POST',
                       headers: {
                           'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                           'Content-Type': 'application/json'
                       },
                       body: JSON.stringify({
                           from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                           to: customerEmail,
                           cc: 'info@ministylecards.com',
                           subject: `付款成功通知 - 訂單 #${orderId}`,
                           html: `<p>親愛的 ${shipping_info?.name || '客戶'} 您好，</p><p>感謝您的購買！您的訂單已付款成功。</p><p>請參閱隨附的電子收據。</p><p>Mini Style Cards</p>`,
                           attachments: [
                               {
                                   filename: `receipt_order_${orderId}.pdf`,
                                   content: base64Data
                               }
                           ]
                       })
                   });
               } catch (e) {
                   console.error("Failed to send receipt email:", e);
               }
            }
          } else {
            const errorMsg = tpData.msg || "付款失敗";
            await db.prepare("UPDATE website_orders SET payment_error = ? WHERE id = ?").run(errorMsg, orderId);
            return res.status(400).json({ error: errorMsg, tp_status: tpData.status, orderId });
          }
        }
      }
      
      res.json({ success: true, orderId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pay", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const { orderId, prime } = req.body;
      if (!orderId || !prime) return res.status(400).json({ error: "Missing orderId or prime" });

      const order = await db.prepare("SELECT * FROM website_orders WHERE id = ? AND user_id = ?").get(orderId, req.user.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.status !== 'pending_payment') return res.status(400).json({ error: "Order is not in pending_payment status" });

      const partnerKey = process.env.TAPPAY_PARTNER_KEY;
      const merchantId = process.env.TAPPAY_MERCHANT_ID;
      const isProd = process.env.TAPPAY_ENV === 'production';
      const tpUrl = isProd ? "https://prod.tappaysdk.com/tpc/payment/pay-by-prime" : "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime";

      if (!partnerKey || !merchantId) {
        console.warn("後端未設定金流對接資訊，跳過 TapPay 扣款，直接標記訂單為已付款。");
        await db.prepare("UPDATE website_orders SET status = 'paid' WHERE id = ?").run(orderId);
        return res.json({ success: true, message: "Payment successful (Simulated)" });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const originUrl = req.headers.origin || `${protocol}://${req.get('host')}`;
      const backendUrl = process.env.WEBSITE_API_URL || `${protocol}://${req.get('host')}`;

      let shippingInfo: any = {};
      try {
        if (order.shipping_info) shippingInfo = JSON.parse(order.shipping_info);
      } catch(e) {}

      // TapPay Pay by Prime Request
      const response = await fetch(tpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": partnerKey,
        },
        body: JSON.stringify({
          prime: prime,
          partner_key: partnerKey,
          merchant_id: merchantId,
          details: "Mini Style Cards Order #" + orderId,
          amount: order.total_amount,
          three_domain_secure: true,
          result_url: {
            frontend_redirect_url: `${originUrl}/api/tappay/result?order_id=${orderId}`,
            backend_notify_url: `${backendUrl}/api/tappay/notify?order_id=${orderId}`
          },
          cardholder: {
            phone_number: shippingInfo.phone || "+886912345678",
            name: shippingInfo.name || req.user?.email.split('@')[0] || "Customer",
            email: req.user?.email || "support@ministylecards.com",
          },
          remember: false,
        }),
      });

      const tpData = await response.json();

      if (tpData.status === 0) {
        if (tpData.payment_url) {
          await db.prepare("UPDATE website_orders SET rec_trade_id = ? WHERE id = ?").run(tpData.rec_trade_id, orderId);
          return res.json({ success: true, payment_url: tpData.payment_url, orderId });
        }

        await db.prepare("UPDATE website_orders SET status = 'paid', rec_trade_id = ?, bank_transaction_id = ? WHERE id = ?").run(tpData.rec_trade_id || null, tpData.bank_transaction_id || null, orderId);

        // Send receipt PDF via email if provided
        const pdfDataString = req.body.receiptPdf || req.body.receipt_file;
        if (pdfDataString && process.env.RESEND_API_KEY) {
           try {
               const base64Data = pdfDataString.includes(',') ? pdfDataString.split(',')[1] : pdfDataString;
               const shippingInfo = order.shipping_info ? JSON.parse(order.shipping_info) : {};
               const customerEmail = shippingInfo?.email || req.user.email || 'support@ministylecards.com';
               await fetch('https://api.resend.com/emails', {
                   method: 'POST',
                   headers: {
                       'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                       'Content-Type': 'application/json'
                   },
                   body: JSON.stringify({
                       from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                       to: customerEmail,
                       cc: 'info@ministylecards.com',
                       subject: `付款成功通知 - 訂單 #${orderId}`,
                       html: `<p>親愛的 ${shippingInfo?.name || '客戶'} 您好，</p><p>感謝您的購買！您的訂單已付款成功。</p><p>請參閱隨附的電子收據。</p><p>Mini Style Cards</p>`,
                       attachments: [
                           {
                               filename: `receipt_order_${orderId}.pdf`,
                               content: base64Data
                           }
                       ]
                   })
               });
           } catch (e) {
               console.error("Failed to send receipt email:", e);
           }
        }

        res.json({ success: true, message: "Payment successful" });
      } else {
        const errorMsg = tpData.msg || "付款失敗";
        await db.prepare("UPDATE website_orders SET payment_error = ? WHERE id = ?").run(errorMsg, orderId);
        res.status(400).json({ error: errorMsg, tp_status: tpData.status });
      }
  } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const verifyTapPayAndUpdateOrder = async (orderId: string, rec_trade_id: string, overrideBankTransactionId: string | null = null) => {
    try {
      const partnerKey = process.env.TAPPAY_PARTNER_KEY;
      const isProd = process.env.TAPPAY_ENV === 'production';
      const tpUrl = isProd ? "https://prod.tappaysdk.com/tpc/transaction/query" : "https://sandbox.tappaysdk.com/tpc/transaction/query";
      
      if (!partnerKey) return false;

      const order = await db.prepare("SELECT * FROM website_orders WHERE id = ?").get(orderId) as any;
      if (!order) return false;

      const response = await fetch(tpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": partnerKey },
        body: JSON.stringify({ partner_key: partnerKey, filters: { rec_trade_id } })
      });
      const data = await response.json();

      if ((data.status === 0 || data.status === 2) && data.trade_records && data.trade_records.length > 0) {
        const record = data.trade_records[0];
        const isPaid = record.record_status === 0 || record.record_status === 1 || record.is_captured === true;
        
        if (isPaid) {
          const bank_transaction_id = overrideBankTransactionId || record.bank_transaction_id || null;
          
          if (order.status !== 'paid') {
              await db.prepare("UPDATE website_orders SET status = 'paid', rec_trade_id = ?, bank_transaction_id = ? WHERE id = ?").run(rec_trade_id, bank_transaction_id, orderId);
              
              // Email Logic
              if (order.receipt_file_base64 && process.env.RESEND_API_KEY) {
                   try {
                       const shippingInfo = order.shipping_info ? JSON.parse(order.shipping_info) : {};
                       const userRec = await db.prepare("SELECT email FROM users WHERE id = ?").get(order.user_id) as any;
                       const customerEmail = shippingInfo?.email || userRec?.email || 'support@ministylecards.com';
                       await fetch('https://api.resend.com/emails', {
                           method: 'POST',
                           headers: {
                               'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                               'Content-Type': 'application/json'
                           },
                           body: JSON.stringify({
                               from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                               to: customerEmail,
                               cc: 'info@ministylecards.com',
                               subject: `付款成功通知 - 訂單 #${orderId}`,
                               html: `<p>親愛的 ${shippingInfo?.name || '客戶'} 您好，</p><p>感謝您的購買！您的訂單已付款成功。</p><p>請參閱隨附的電子收據。</p><p>Mini Style Cards</p>`,
                               attachments: [
                                   {
                                       filename: `receipt_order_${orderId}.pdf`,
                                       content: order.receipt_file_base64
                                   }
                               ]
                           })
                       });
                   } catch(e) { console.error("[Verify Send Email Error]", e); }
              }
          }
          return true;
        } else {
           await db.prepare("UPDATE website_orders SET payment_error = ? WHERE id = ?").run(record.bank_result_msg || "Reviewing payment...", orderId);
           return false;
        }
      }
      return false;
    } catch (e) {
      console.error("[TapPay Verify] Error:", e);
      return false;
    }
  };

  app.all("/api/tappay/result", express.urlencoded({ extended: true }), express.json(), async (req, res) => {
    const status = req.body?.status ?? req.query?.status;
    const msg = req.body?.msg ?? req.query?.msg ?? 'Payment Failed';
    const orderId = req.query?.order_id as string;
    const rec_trade_id = req.body?.rec_trade_id || req.query?.rec_trade_id;
    const bank_transaction_id = req.body?.bank_transaction_id || req.query?.bank_transaction_id;

    if (status === 0 || status === '0') {
        if (orderId && rec_trade_id) {
            await verifyTapPayAndUpdateOrder(orderId, rec_trade_id, bank_transaction_id);
        } else if (orderId) {
            try {
                await db.prepare("UPDATE website_orders SET status = 'paid', rec_trade_id = ?, bank_transaction_id = ? WHERE id = ?").run(rec_trade_id || null, bank_transaction_id || null, orderId);
            } catch (err) {
                console.error("[TapPay Result] Error updating order:", err);
            }
        }
         res.redirect('/checkout?payment=success');
    } else {
         if (orderId) {
            try {
                await db.prepare("UPDATE website_orders SET payment_error = ? WHERE id = ?").run(msg, orderId);
            } catch (err) {
                console.error("[TapPay Result] Error updating order:", err);
            }
         }
         res.redirect('/checkout?payment=failed&msg=' + encodeURIComponent(msg));
    }
  });

  app.post("/api/tappay/notify", express.urlencoded({ extended: true }), express.json(), async (req, res) => {
    try {
      console.log("[TapPay Notify] Received POST", req.query, req.body);
      const orderId = req.query.order_id as string;
      if (!orderId) {
        console.error("[TapPay Notify] Missing order_id");
        return res.status(400).send("Missing order_id");
      }
      
      const { status, rec_trade_id, bank_transaction_id, msg } = req.body;
      console.log(`[TapPay Notify] Order ID: ${orderId}, Status: ${status}, Msg: ${msg}`);
      
      const order = await db.prepare("SELECT * FROM website_orders WHERE id = ?").get(orderId) as any;
      if (!order) {
        console.error("[TapPay Notify] Order not found for id", orderId);
        return res.status(404).send("Order not found");
      }
      
      if (status === 0 || status === '0') {
        if (order.status !== 'paid' && rec_trade_id) {
          console.log("[TapPay Notify] Calling verifyTapPayAndUpdateOrder", orderId);
          await verifyTapPayAndUpdateOrder(orderId, rec_trade_id, bank_transaction_id);
        }
      } else {
        console.log("[TapPay Notify] Payment failed with msg", msg);
        await db.prepare("UPDATE website_orders SET payment_error = ? WHERE id = ?").run(msg || "3D Secure Failed", orderId);
      }
      
      return res.send("OK");
    } catch (error) {
      console.error("TapPay Notify Error:", error);
      return res.status(500).send("Error");
    }
  });

  app.put("/api/orders/:id/paid", async (req, res) => {
    try {
      await db.prepare("UPDATE website_orders SET status = 'paid' WHERE id = ?").run(req.params.id);
      res.json({ success: true, message: "Order marked as paid" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders/:id", authenticateWebsiteUser, async (req: any, res) => {
    try {
      const order = await db.prepare("SELECT * FROM website_orders WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      
      const items = await db.prepare("SELECT o.*, p.title, p.images FROM website_order_items o JOIN website_products p ON o.product_id = p.id WHERE o.order_id = ?").all(order.id);
      
      order.shipping_info = order.shipping_info ? JSON.parse(order.shipping_info) : {};
      order.items = items.map((i: any) => ({ ...i, images: i.images ? JSON.parse(i.images) : [], image_alts: i.image_alts ? JSON.parse(i.image_alts) : [], config: i.config ? JSON.parse(i.config) : {} }));
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 5. Contact
  // ==========================================
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, subject, message } = req.body;
      if (!name || !email || !message) return res.status(400).json({ error: "Missing required fields" });
      
      await db.prepare(
        "INSERT INTO website_contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)"
      ).run(name, email, phone, subject, message);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 6. Posts / Journal
  // ==========================================
  app.get("/api/posts", async (req, res) => {
    try {
      const { limit = 10, offset = 0 } = req.query;
      const posts = await db.prepare("SELECT id, title, slug, excerpt, feature_image, published_at FROM website_posts WHERE is_published = 1 ORDER BY published_at DESC LIMIT ? OFFSET ?")
        .all(Number(limit), Number(offset));
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/posts/:slug", async (req, res) => {
    try {
      const post = await db.prepare("SELECT * FROM website_posts WHERE slug = ? AND is_published = 1").get(req.params.slug);
      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // 7. Admin Website APIs (CRUD for CMS)
  // ==========================================
  
  // Orders (Admin)
  app.get("/api/admin/website/orders", authenticateAdmin, async (req, res) => {
    try {
      const orders = await db.prepare(`
        SELECT o.*, u.email as user_email 
        FROM website_orders o 
        LEFT JOIN website_users u ON o.user_id = u.id 
        ORDER BY o.created_at DESC
      `).all();
      res.json(orders);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.get("/api/admin/website/orders/:id", authenticateAdmin, async (req, res) => {
    try {
      const order = await db.prepare(`
        SELECT o.*, u.email as user_email 
        FROM website_orders o 
        LEFT JOIN website_users u ON o.user_id = u.id 
        WHERE o.id = ?
      `).get(req.params.id);
      if (!order) return res.status(404).json({ error: "Not found" });
      
      const items = await db.prepare("SELECT o.*, p.title, p.images FROM website_order_items o JOIN website_products p ON o.product_id = p.id WHERE o.order_id = ?").all(order.id);
      
      res.json({ ...order, items });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.put("/api/admin/website/orders/:id", authenticateAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      await db.prepare("UPDATE website_orders SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post("/api/admin/website/orders/:id/transfer", authenticateAdmin, async (req, res) => {
    try {
      const order = await db.prepare("SELECT * FROM website_orders WHERE id = ?").get(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      
      const items = await db.prepare("SELECT o.*, p.title FROM website_order_items o JOIN website_products p ON o.product_id = p.id WHERE o.order_id = ?").all(order.id);
      
      let receiver_name = "";
      let receiver_phone = "";
      let receiver_address = "";
      let email = "";
      let notes = `[官網訂單 #${order.id}]\n\n`;

      if (order.shipping_info) {
        try {
          const shippingInfo = JSON.parse(order.shipping_info);
          receiver_name = shippingInfo.name || "";
          receiver_phone = shippingInfo.phone || "";
          receiver_address = shippingInfo.address || "";
          email = shippingInfo.email || "";
          if (shippingInfo.notes) {
            notes += `客戶備註: ${shippingInfo.notes}\n\n`;
          }
        } catch (e) {}
      }

      let invitation_quantity = 0;
      let mappedConfig: any = {};

      items.forEach((item: any) => {
        notes += `- ${item.title} x ${item.quantity}\n`;
        if (item.title.includes('喜帖') || item.title.includes('邀請卡')) {
           invitation_quantity += item.quantity;
        }

        if (item.config) {
          try {
            const configObj = JSON.parse(item.config);
            Object.entries(configObj).forEach(([k, v]) => {
              notes += `  ${k}: ${v}\n`;
              // Try to map known values
              if (k.includes('蠟封樣式') || k.includes('封蠟樣式')) mappedConfig.wax_seal_style = v;
              if (k.includes('蠟封顏色') || k.includes('封蠟顏色')) mappedConfig.wax_seal_color = v;
              if (k.includes('信封顏色')) mappedConfig.envelope_color = v;
              if (k.includes('信封燙金') || k.includes('燙金位置')) mappedConfig.envelope_foil_position = v;
            });
          } catch(e) {}
        }
      });

      // Generate a random order_code
      const generateUniqueCode = async (): Promise<string> => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < 5; i++) {
          let code = '';
          for (let j = 0; j < 8; j++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
          }
          const existing = await db.prepare("SELECT id FROM weddings WHERE order_code = ?").get(code);
          if (!existing) return code;
        }
        return `W${Date.now()}`;
      };

      const orderCode = await generateUniqueCode();
      const today = new Date().toISOString().split('T')[0];

      const socialId = email || receiver_name ? `${email || receiver_name} (官網)` : `官網訂單 #${order.id}`;

      const result = await db.prepare(`
        INSERT INTO weddings (
          receiver_name, receiver_phone, receiver_address, email,
          status, order_code, order_type, amount, payment_date, notes,
          social_id, contact_source, tags, invitation_quantity,
          wax_seal_style, wax_seal_color, envelope_color, envelope_foil_position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiver_name, receiver_phone, receiver_address, email,
        '新進訂單', orderCode, 'invitation', order.total_amount, 
        order.status === 'paid' ? today : null,
        notes,
        socialId, '官網', '官網轉單',
        invitation_quantity || null,
        mappedConfig.wax_seal_style || null,
        mappedConfig.wax_seal_color || null,
        mappedConfig.envelope_color || null,
        mappedConfig.envelope_foil_position || null
      );

      res.json({ success: true, wedding_id: result.lastInsertRowid });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/admin/website/orders/:id/sync", authenticateAdmin, async (req, res) => {
    try {
      const order = await db.prepare("SELECT * FROM website_orders WHERE id = ?").get(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (!order.rec_trade_id) return res.status(400).json({ error: "No TapPay transaction ID found for this order" });

      const partnerKey = process.env.TAPPAY_PARTNER_KEY;
      const isProd = process.env.TAPPAY_ENV === 'production';
      const tpUrl = isProd ? "https://prod.tappaysdk.com/tpc/transaction/query" : "https://sandbox.tappaysdk.com/tpc/transaction/query";

      if (!partnerKey) return res.status(400).json({ error: "TapPay credentials not configured" });

      const response = await fetch(tpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": partnerKey,
        },
        body: JSON.stringify({
          partner_key: partnerKey,
          filters: {
            rec_trade_id: order.rec_trade_id
          }
        }),
      });

      const data = await response.json();
      if ((data.status === 0 || data.status === 2) && data.trade_records && data.trade_records.length > 0) {
        const record = data.trade_records[0];
        // In TapPay, record_status: 0 is authorized, 1 is captured(?)
        const isPaid = record.record_status === 0 || record.record_status === 1 || record.is_captured === true;
        const newStatus = isPaid ? 'paid' : order.status;
        const bank_transaction_id = record.bank_transaction_id;
        
        await db.prepare("UPDATE website_orders SET status = ?, bank_transaction_id = ? WHERE id = ?").run(newStatus, bank_transaction_id || null, order.id);
        
        res.json({ success: true, status: newStatus, bank_transaction_id, record });
      } else {
        res.json({ success: false, message: "Could not query TapPay or no records found.", raw_data: data });
      }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/website/orders/:id", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("DELETE FROM website_order_items WHERE order_id = ?").run(req.params.id);
      await db.prepare("DELETE FROM website_orders WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Categories
  app.get("/api/admin/website/categories", async (req, res) => {
    try {
      const categories = await db.prepare("SELECT * FROM website_categories ORDER BY id DESC").all();
      res.json(categories);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post("/api/admin/website/categories", authenticateAdmin, async (req, res) => {
    try {
      const { name, slug } = req.body;
      const result = await db.prepare("INSERT INTO website_categories (name, slug) VALUES (?, ?)").run(name, slug);
      res.json({ id: result.lastInsertRowid, name, slug });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.put("/api/admin/website/categories/:id", authenticateAdmin, async (req, res) => {
    try {
      const { name, slug } = req.body;
      await db.prepare("UPDATE website_categories SET name = ?, slug = ? WHERE id = ?").run(name, slug, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.delete("/api/admin/website/categories/:id", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("DELETE FROM website_categories WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Collections
  app.get("/api/admin/website/collections", async (req, res) => {
    try {
      const collections = await db.prepare("SELECT * FROM website_collections ORDER BY sort_order ASC, id DESC").all();
      res.json(collections);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post("/api/admin/website/collections/reorder", authenticateAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid data" });
      
      const stmt = db.prepare("UPDATE website_collections SET sort_order = ? WHERE id = ?");
      for (const item of items) {
        if (item.id !== undefined && item.sort_order !== undefined) {
          await stmt.run(item.sort_order, item.id);
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/admin/website/collections", authenticateAdmin, async (req, res) => {
    try {
      const { title, slug, description, cover_image, cover_image_alt, is_active } = req.body;
      const result = await db.prepare("INSERT INTO website_collections (title, slug, description, cover_image, cover_image_alt, is_active) VALUES (?, ?, ?, ?, ?, ?)").run(title, slug, description, cover_image, cover_image_alt || null, is_active !== undefined ? (is_active ? 1 : 0) : 1);
      res.json({ id: result.lastInsertRowid, title, slug, description, cover_image, cover_image_alt, is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1 });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.put("/api/admin/website/collections/:id", authenticateAdmin, async (req, res) => {
    try {
      const { title, slug, description, cover_image, cover_image_alt, is_active } = req.body;
      await db.prepare("UPDATE website_collections SET title = ?, slug = ?, description = ?, cover_image = ?, cover_image_alt = ?, is_active = ? WHERE id = ?").run(title, slug, description, cover_image, cover_image_alt || null, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.delete("/api/admin/website/collections/:id", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("DELETE FROM website_collections WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Pricing Rules
  app.get("/api/admin/website/pricing_rules", async (req, res) => {
    try {
      const rules = await db.prepare("SELECT * FROM website_pricing_rules").all();
      res.json(rules.map((r: any) => ({
        ...r,
        tiers: r.tiers_json ? JSON.parse(r.tiers_json) : []
      })));
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post("/api/admin/website/pricing_rules", authenticateAdmin, async (req, res) => {
    try {
      const { name, rule_type, tiers, notes, shipping_fee_per_box, items_per_box } = req.body;
      const result = await db.prepare(`
        INSERT INTO website_pricing_rules (name, rule_type, tiers_json, notes, shipping_fee_per_box, items_per_box) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, rule_type, JSON.stringify(tiers || []), notes || '', shipping_fee_per_box || null, items_per_box || null);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.put("/api/admin/website/pricing_rules/:id", authenticateAdmin, async (req, res) => {
    try {
      const { name, rule_type, tiers, notes, shipping_fee_per_box, items_per_box } = req.body;
      await db.prepare(`
        UPDATE website_pricing_rules 
        SET name=?, rule_type=?, tiers_json=?, notes=?, shipping_fee_per_box=?, items_per_box=?
        WHERE id=?
      `).run(name, rule_type, JSON.stringify(tiers || []), notes || '', shipping_fee_per_box || null, items_per_box || null, req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.delete("/api/admin/website/pricing_rules/:id", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("DELETE FROM website_pricing_rules WHERE id = ?").run(req.params.id);
      await db.prepare("UPDATE website_products SET pricing_rule_id = NULL WHERE pricing_rule_id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Addon Groups
  app.get("/api/admin/website/addon_groups", async (req, res) => {
    try {
      const groups = await db.prepare("SELECT * FROM website_addon_groups").all();
      res.json(groups.map((g: any) => ({
        ...g,
        options: g.options ? JSON.parse(g.options) : [],
        is_default_for_invitation: !!g.is_default_for_invitation
      })));
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post("/api/admin/website/addon_groups", authenticateAdmin, async (req, res) => {
    try {
      const { title, input_type, options, is_default_for_invitation, display_group, max_selections } = req.body;
      const result = await db.prepare(`
        INSERT INTO website_addon_groups (title, input_type, options, is_default_for_invitation, display_group, max_selections) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(title, input_type || 'select', JSON.stringify(options || []), is_default_for_invitation ? 1 : 0, display_group || null, max_selections || 0);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.put("/api/admin/website/addon_groups/:id", authenticateAdmin, async (req, res) => {
    try {
      const { title, input_type, options, is_default_for_invitation, display_group, max_selections } = req.body;
      await db.prepare(`
        UPDATE website_addon_groups 
        SET title=?, input_type=?, options=?, is_default_for_invitation=?, display_group=?, max_selections=?
        WHERE id=?
      `).run(title, input_type || 'select', JSON.stringify(options || []), is_default_for_invitation ? 1 : 0, display_group || null, max_selections || 0, req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.delete("/api/admin/website/addon_groups/:id", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("DELETE FROM website_addon_groups WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Settings
  app.get("/api/admin/website/settings/:key", async (req, res) => {
    try {
      const setting = await db.prepare("SELECT value FROM website_settings WHERE key = ?").get(req.params.key);
      res.json(setting ? JSON.parse(setting.value) : []);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.put("/api/admin/website/settings/:key", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("INSERT INTO website_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(req.params.key, JSON.stringify(req.body));
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Products
  app.get("/api/admin/website/products", async (req, res) => {
    try {
      const products = await db.prepare("SELECT * FROM website_products ORDER BY sort_order ASC, id DESC").all();
      res.json(products.map((p: any) => ({
        ...p,
        images: p.images ? JSON.parse(p.images) : [],
        image_alts: p.image_alts ? JSON.parse(p.image_alts) : [],
        variants: p.variants ? JSON.parse(p.variants) : {},
        inclusions: p.inclusions ? JSON.parse(p.inclusions) : []
      })));
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.get("/api/admin/website/products/:id", async (req, res) => {
    try {
      const product = await db.prepare("SELECT * FROM website_products WHERE id = ?").get(req.params.id);
      if (!product) return res.status(404).json({ error: "Not found" });
      product.images = product.images ? JSON.parse(product.images) : [];
      product.variants = product.variants ? JSON.parse(product.variants) : {};
      product.inclusions = product.inclusions ? JSON.parse(product.inclusions) : [];
      res.json(product);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post("/api/admin/website/products", authenticateAdmin, async (req, res) => {
    try {
      const { title, slug, description, base_price, shipping_fee, category_id, collection_id, images, image_alts, variants, is_active, seo_title, seo_description, min_qty, product_type, inclusions, pricing_rule_id, image_loop_count, image_loop_var } = req.body;
      const result = await db.prepare(`
        INSERT INTO website_products 
        (title, slug, description, base_price, shipping_fee, category_id, collection_id, images, image_alts, variants, is_active, seo_title, seo_description, min_qty, product_type, inclusions, pricing_rule_id, image_loop_count, image_loop_var) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, slug, description, base_price, shipping_fee || 0, category_id, collection_id, JSON.stringify(images || []), JSON.stringify(image_alts || []), JSON.stringify(variants || {}), is_active ? 1 : 0, seo_title, seo_description, min_qty || 1, product_type || 'standard', JSON.stringify(inclusions || []), pricing_rule_id || null, image_loop_count || null, image_loop_var || null);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.post("/api/admin/website/products/reorder", authenticateAdmin, async (req, res) => {
    try {
      const { items } = req.body; // [{id, sort_order}, ...]
      if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid data" });
      
      const stmt = db.prepare("UPDATE website_products SET sort_order = ? WHERE id = ?");
      for (const item of items) {
        if (item.id && typeof item.sort_order === 'number') {
          stmt.run(item.sort_order, item.id);
        }
      }
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.put("/api/admin/website/products/:id", authenticateAdmin, async (req, res) => {
    try {
      const { title, slug, description, base_price, shipping_fee, category_id, collection_id, images, image_alts, variants, is_active, seo_title, seo_description, min_qty, product_type, inclusions, pricing_rule_id, image_loop_count, image_loop_var } = req.body;
      await db.prepare(`
        UPDATE website_products 
        SET title=?, slug=?, description=?, base_price=?, shipping_fee=?, category_id=?, collection_id=?, images=?, image_alts=?, variants=?, is_active=?, seo_title=?, seo_description=?, min_qty=?, product_type=?, inclusions=?, pricing_rule_id=?, image_loop_count=?, image_loop_var=?
        WHERE id=?
      `).run(title, slug, description, base_price, shipping_fee || 0, category_id, collection_id, JSON.stringify(images || []), JSON.stringify(image_alts || []), JSON.stringify(variants || {}), is_active ? 1 : 0, seo_title, seo_description, min_qty || 1, product_type || 'standard', JSON.stringify(inclusions || []), pricing_rule_id || null, image_loop_count || null, image_loop_var || null, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.delete("/api/admin/website/products/:id", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("DELETE FROM website_products WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Posts
  app.get("/api/admin/website/posts", async (req, res) => {
    try {
      const posts = await db.prepare("SELECT * FROM website_posts ORDER BY created_at DESC").all();
      res.json(posts);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.get("/api/admin/website/posts/:id", async (req, res) => {
    try {
      const post = await db.prepare("SELECT * FROM website_posts WHERE id = ?").get(req.params.id);
      if (!post) return res.status(404).json({ error: "Not found" });
      res.json(post);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post("/api/admin/website/posts", authenticateAdmin, async (req, res) => {
    try {
      const { title, excerpt, content, feature_image, feature_image_alt, seo_title, seo_description, is_published, published_at, tags } = req.body;
      let slug = req.body.slug;
      if (!slug || slug.trim() === "") slug = `post-${Date.now()}`;
      
      const result = await db.prepare(`
        INSERT INTO website_posts
        (title, slug, excerpt, content, feature_image, feature_image_alt, seo_title, seo_description, is_published, published_at, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, slug, excerpt, content, feature_image, feature_image_alt || null, seo_title, seo_description, is_published ? 1 : 0, published_at, tags ? JSON.stringify(tags) : JSON.stringify([]));
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.put("/api/admin/website/posts/:id", authenticateAdmin, async (req, res) => {
    try {
      const { title, excerpt, content, feature_image, feature_image_alt, seo_title, seo_description, is_published, published_at, tags } = req.body;
      let slug = req.body.slug;
      if (!slug || slug.trim() === "") slug = `post-${Date.now()}`;

      await db.prepare(`
        UPDATE website_posts
        SET title=?, slug=?, excerpt=?, content=?, feature_image=?, feature_image_alt=?, seo_title=?, seo_description=?, is_published=?, published_at=?, tags=?
        WHERE id=?
      `).run(title, slug, excerpt, content, feature_image, feature_image_alt || null, seo_title, seo_description, is_published ? 1 : 0, published_at, tags ? JSON.stringify(tags) : JSON.stringify([]), req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '該網址路徑 (Slug) 已經存在，請更換另一個' });
      }
      res.status(500).json({ error: error.message }); 
    }
  });
  app.delete("/api/admin/website/posts/:id", authenticateAdmin, async (req, res) => {
    try {
      await db.prepare("DELETE FROM website_posts WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
}
