import express from "express";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import https from "https";

const SECRET_KEY = process.env.JWT_SECRET || "super-secret-key-for-dev";

// Ensure fonts directory exists and download a Chinese font if needed
const fontDir = path.join(process.cwd(), "fonts");
if (!fs.existsSync(fontDir)) {
  fs.mkdirSync(fontDir, { recursive: true });
}
const fontPath = path.join(fontDir, "NotoSansTC-Regular.otf");

function downloadFont() {
  if (!fs.existsSync(fontPath)) {
    console.log("Downloading Chinese font for PDF generation...");
    const file = fs.createWriteStream(fontPath);
    // Using a reliable CDN for Noto Sans CJK TC Regular
    https.get("https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Regular.otf", function(response) {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log("Font downloaded successfully.");
      });
    }).on("error", (err) => {
      fs.unlink(fontPath, () => {});
      console.error("Error downloading font:", err.message);
    });
  }
}
downloadFont();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  const DATA_DIR = process.env.DATA_DIR || process.cwd();

  // Configure multer for PDF uploads (in memory for R2)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });


  const isPg = !!process.env.DATABASE_URL;
  const isS3 = !!process.env.R2_ENDPOINT;

  let pool: any;
  let db: any;
  let s3: any;

  if (isS3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT?.startsWith('https://') 
        ? process.env.R2_ENDPOINT 
        : `https://undefined`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      }
    });
  } else {
    const localTemplatesDir = path.join(DATA_DIR, 'templates');
    if (!fs.existsSync(localTemplatesDir)) {
      fs.mkdirSync(localTemplatesDir, { recursive: true });
    }

    s3 = {
      send: async (command: any) => {
        const input = command.input || {};
        const filePath = input.Key ? path.join(localTemplatesDir, input.Key) : null;

        if (command instanceof PutObjectCommand) {
          fs.writeFileSync(filePath!, input.Body);
          return {};
        } else if (command instanceof GetObjectCommand) {
          if (!fs.existsSync(filePath!)) {
            const err: any = new Error('NoSuchKey');
            err.name = 'NoSuchKey';
            throw err;
          }
          const size = fs.statSync(filePath!).size;
          return {
            ContentType: input.Key.endsWith('.svgz') ? 'image/svg+xml' : 'application/pdf',
            ContentLength: size,
            Body: fs.createReadStream(filePath!)
          };
        } else if (command instanceof DeleteObjectCommand) {
          if (fs.existsSync(filePath!)) fs.unlinkSync(filePath!);
          return {};
        }
      }
    };
  }

  if (isPg) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    db = {
      prepare: (sql: string) => {
        return {
          get: async (...args: any[]) => {
            let pgSql = sql;
            let idx = 1;
            pgSql = pgSql.replace(/\?/g, () => `\$${idx++}`);
            const { rows } = await pool.query(pgSql, args);
            return rows[0];
          },
          all: async (...args: any[]) => {
            let pgSql = sql;
            let idx = 1;
            pgSql = pgSql.replace(/\?/g, () => `\$${idx++}`);
            const { rows } = await pool.query(pgSql, args);
            return rows;
          },
          run: async (...args: any[]) => {
            let pgSql = sql;
            let idx = 1;
            pgSql = pgSql.replace(/\?/g, () => `\$${idx++}`);
            const result = await pool.query(pgSql, args);
            return { lastInsertRowid: (result.rows[0]?.id || 0), changes: result.rowCount };
          }
        };
      },
      exec: async (sql: string) => {
        const pgSql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
                         .replace(/DATETIME/g, 'TIMESTAMP');
        await pool.query(pgSql);
      },
      transaction: async (cb: () => Promise<void>) => {
        await pool.query('BEGIN');
        try {
          await cb();
          await pool.query('COMMIT');
        } catch (err) {
          await pool.query('ROLLBACK');
          throw err;
        }
      },
      pragma: async (cmd: string) => {
         console.log('Skipping pragma:', cmd);
         return [];
      }
    };
  } else {
    const { default: DatabaseConstructor } = await import('better-sqlite3');
    const sqliteDb = new DatabaseConstructor(path.join(DATA_DIR, "weddings.db"));
    sqliteDb.pragma('journal_mode = WAL');
    
    db = {
      prepare: (sql: string) => {
        const stmt = sqliteDb.prepare(sql);
        return {
          get: async (...args: any[]) => stmt.get(...args),
          all: async (...args: any[]) => stmt.all(...args),
          run: async (...args: any[]) => {
             const info = stmt.run(...args);
             if (info && info.lastInsertRowid && typeof info.lastInsertRowid === 'bigint') {
                info.lastInsertRowid = Number(info.lastInsertRowid);
             }
             return info;
          }
        };
      },
      exec: async (sql: string) => sqliteDb.exec(sql),
      transaction: async (cb: () => Promise<void>) => {
        sqliteDb.exec('BEGIN');
        try {
          await cb();
          sqliteDb.exec('COMMIT');
        } catch (err) {
          sqliteDb.exec('ROLLBACK');
          throw err;
        }
      },
      pragma: async (cmd: string) => sqliteDb.pragma(cmd)
    };
  }

  
    await db.exec(`
    CREATE TABLE IF NOT EXISTS weddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groom_name_zh TEXT,
      groom_name_en TEXT,
      bride_name_zh TEXT,
      bride_name_en TEXT,
      wedding_date TEXT,
      wedding_time TEXT,
      venue_name TEXT,
      venue_address TEXT,
      template_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT,
      filename TEXT,
      filename_back TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS designers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      ig_handle TEXT,
      email TEXT,
      phone TEXT,
      wedding_date TEXT,
      delivery_date TEXT,
      quotation_data TEXT,
      total_amount INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS marketing_email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wedding_id INTEGER,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default email template
  const defaultSubjectTemplate = "您的喜帖快遞已寄出 - 訂單 #{{order_id}}";
  const defaultBodyTemplate = "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n您的喜帖已經寄出囉！\n快遞單號為：{{tracking_number}}\n\n如有任何問題，歡迎隨時與我們聯繫。\n\n祝您 順心\nMini Style Cards";
  
  const defaultMarketingSubject = "專屬優惠通知";
  const defaultMarketingBody = "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n感謝您選擇 Mini Style Cards！\n\n我們為您準備了專屬優惠，歡迎回購！\n\n祝您 順心\nMini Style Cards\n\n若您不想再收到此類通知，請點擊以下連結退訂：\n{{unsubscribe_link}}";

  const subjectSetting = await db.prepare("SELECT value FROM settings WHERE key = 'email_subject'").get();
  if (!subjectSetting) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('email_subject', ?)").run(defaultSubjectTemplate);
  }
  const bodySetting = await db.prepare("SELECT value FROM settings WHERE key = 'email_body'").get();
  if (!bodySetting) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('email_body', ?)").run(defaultBodyTemplate);
  }
  const marketingSubjectSetting = await db.prepare("SELECT value FROM settings WHERE key = 'marketing_email_subject'").get();
  if (!marketingSubjectSetting) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('marketing_email_subject', ?)").run(defaultMarketingSubject);
  }
  const marketingBodySetting = await db.prepare("SELECT value FROM settings WHERE key = 'marketing_email_body'").get();
  if (!marketingBodySetting) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('marketing_email_body', ?)").run(defaultMarketingBody);
  }
  const tagsSetting = await db.prepare("SELECT value FROM settings WHERE key = 'recommended_tags'").get();
  if (!tagsSetting) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('recommended_tags', ?)").run("已買書約,潛在彌月客,VIP,急件,海外客戶,需特別注意");
  }

  try {
  // Migration: Add new columns if they don't exist
  const columns = await db.prepare("PRAGMA table_info(weddings)").all() as any[];
  const columnNames = columns.map(c => c.name);
  
  const newColumns = [
    { name: 'contact_source', type: 'TEXT' },
    { name: 'social_id', type: 'TEXT' },
    { name: 'groom_father_name', type: 'TEXT' },
    { name: 'groom_mother_name', type: 'TEXT' },
    { name: 'bride_father_name', type: 'TEXT' },
    { name: 'bride_mother_name', type: 'TEXT' },
    { name: 'grandparents_names', type: 'TEXT' },
    { name: 'schedule_tea_ceremony', type: 'TEXT' },
    { name: 'schedule_wedding_ceremony', type: 'TEXT' },
    { name: 'schedule_welcome_reception', type: 'TEXT' },
    { name: 'schedule_lunch_banquet', type: 'TEXT' },
    { name: 'schedule_dinner_banquet', type: 'TEXT' },
    { name: 'schedule_seeing_off', type: 'TEXT' },
    { name: 'invitation_quantity', type: 'INTEGER' },
    { name: 'envelope_sender_address', type: 'TEXT' },
    { name: 'receiver_name', type: 'TEXT' },
    { name: 'receiver_phone', type: 'TEXT' },
    { name: 'receiver_address', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'schedule_unconfirmed', type: 'INTEGER' },
    { name: 'wax_seal_style', type: 'TEXT' },
    { name: 'wax_seal_color', type: 'TEXT' },
    { name: 'envelope_color', type: 'TEXT' },
    { name: 'envelope_foil_position', type: 'TEXT' },
    { name: 'envelope_logo', type: 'TEXT' },
    { name: 'designer_id', type: 'INTEGER' },
    { name: 'status', type: 'TEXT DEFAULT "新進訂單"' },
    { name: 'order_code', type: 'TEXT' },
    { name: 'payment_date', type: 'TEXT' },
    { name: 'amount', type: 'INTEGER' },
    { name: 'design_deadline', type: 'TEXT' },
    { name: 'delivery_date', type: 'TEXT' },
    { name: 'tracking_number', type: 'TEXT' },
    { name: 'processing_options', type: 'TEXT' },
    { name: 'bank_last_5', type: 'TEXT' },
    { name: 'tax', type: 'INTEGER' },
    { name: 'invoice_number', type: 'TEXT' },
    { name: 'tags', type: 'TEXT' },
    { name: 'order_type', type: 'TEXT DEFAULT "invitation"' },
    { name: 'unsubscribed', type: 'INTEGER DEFAULT 0' },
    { name: 'notes', type: 'TEXT' }
  ];

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await db.exec(`ALTER TABLE weddings ADD COLUMN ${col.name} ${col.type}`);
    }
  }

  // Migration: update existing weddings tax to 5% if it is 0 or NULL
  // This ensures existing orders have tax calculated correctly, while allowing future orders to explicitly set tax to 0 if needed.
  await db.exec(`
    UPDATE weddings 
    SET tax = ROUND(amount * 0.05) 
    WHERE tax IS NULL OR tax = 0
  `);

  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_order_code ON weddings(order_code) WHERE order_code IS NOT NULL;");

  // Migration: delete default templates
  await db.prepare("DELETE FROM templates WHERE id IN ('template1', 'template2')").run();

  // Create expenses table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_date TEXT NOT NULL,
      item_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create incomes table for manual other incomes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_date TEXT NOT NULL,
      item_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      tax INTEGER DEFAULT 0,
      bank_last_5 TEXT,
      notes TEXT,
      invoice_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add invoice_number to incomes if it doesn't exist
  const incomeColumns = await db.prepare("PRAGMA table_info(incomes)").all() as any[];
  if (!incomeColumns.some(c => c.name === 'invoice_number')) {
    await db.exec("ALTER TABLE incomes ADD COLUMN invoice_number TEXT");
  }

  // Migration: Add notes to quotations
  const quotationCols = db.pragma("table_info(quotations)") as any[];
  if (!quotationCols.find(c => c.name === 'notes')) {
    await db.exec("ALTER TABLE quotations ADD COLUMN notes TEXT");
  }

  } catch (migrationErr) {
  console.warn('Skipping SQLite migrations');
}

  // Seed default templates if none exist
  // Removed default templates as per user request

  // Seed default designers if none exist
  const designerCount = await db.prepare("SELECT COUNT(*) as count FROM designers").get() as any;
  if (designerCount.count === 0) {
    const insertDesigner = db.prepare("INSERT INTO designers (name, username, password) VALUES (?, ?, ?)");
    const defaultPassword = bcrypt.hashSync("password123", 10);
    insertDesigner.run("Leo", "leo", defaultPassword);
    insertDesigner.run("Joanne", "joanne", defaultPassword);
  }

  // Migration: Add role column to designers
  const designerColumns = await db.prepare("PRAGMA table_info(designers)").all() as any[];
  const designerColumnNames = designerColumns.map(c => c.name);
  if (!designerColumnNames.includes('role')) {
    await db.prepare("ALTER TABLE designers ADD COLUMN role TEXT DEFAULT 'designer'").run();
  }

  // Ensure admin account exists
  const adminExists = await db.prepare("SELECT id FROM designers WHERE username = 'admin'").get();
  if (!adminExists) {
    const adminPassword = bcrypt.hashSync("admin123", 10);
    await db.prepare("INSERT INTO designers (name, username, password, role) VALUES (?, ?, ?, ?)").run("管理員", "admin", adminPassword, "admin");
  }

  // Auth Middleware
  const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      (req as any).user = user;
      next();
    });
  };

  // API Routes
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const designer = await db.prepare("SELECT * FROM designers WHERE username = ?").get(username) as any;
      if (!designer) return res.status(400).json({ error: "無效的帳號或密碼" });
      
      const validPassword = bcrypt.compareSync(password, designer.password);
      if (!validPassword) return res.status(400).json({ error: "無效的帳號或密碼" });
      
      const token = jwt.sign({ id: designer.id, name: designer.name, username: designer.username, role: designer.role }, SECRET_KEY, { expiresIn: '24h' });
      res.json({ token, designer: { id: designer.id, name: designer.name, role: designer.role } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/designers", authenticateToken, async (req, res) => {
    try {
      const designers = await db.prepare("SELECT id, name, username FROM designers").all();
      res.json(designers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/designers", authenticateToken, async (req, res) => {
    try {
      const { name, username, password } = req.body;
      if (!name || !username || !password) {
        return res.status(400).json({ error: "請填寫所有欄位" });
      }
      const existing = await db.prepare("SELECT id FROM designers WHERE username = ?").get(username);
      if (existing) {
        return res.status(400).json({ error: "此帳號已存在" });
      }
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = await db.prepare("INSERT INTO designers (name, username, password) VALUES (?, ?, ?)").run(name, username, hashedPassword);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/designers/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, password } = req.body;
      if (!name) {
        return res.status(400).json({ error: "請填寫顯示名稱" });
      }
      
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        await db.prepare("UPDATE designers SET name = ?, password = ? WHERE id = ?").run(name, hashedPassword, id);
      } else {
        await db.prepare("UPDATE designers SET name = ? WHERE id = ?").run(name, id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/designers/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      await db.prepare("DELETE FROM designers WHERE id = ?").run(id);
      // Also unassign this designer from any weddings
      await db.prepare("UPDATE weddings SET designer_id = NULL WHERE designer_id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings API
  app.get("/api/settings/public", async (req, res) => {
    try {
      const keys = ['wedding_form_image_a', 'wedding_form_image_b', 'wedding_form_image_c'];
      const placeholders = keys.map(() => '?').join(',');
      const settings = await db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(keys) as any[];
      const settingsMap = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
      res.json(settingsMap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings", authenticateToken, async (req, res) => {
    try {
      const settings = await db.prepare("SELECT key, value FROM settings").all() as any[];
      const settingsMap = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
      res.json(settingsMap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings", authenticateToken, async (req, res) => {
    try {
      const { 
        email_subject, 
        email_body, 
        recommended_tags,
        quotation_packages,
        quotation_illustrators,
        quotation_addons,
        quotation_independent_addons,
        quotation_certificates,
        quotation_terms,
        wedding_form_image_a,
        wedding_form_image_b,
        wedding_form_image_c
      } = req.body;
      
      const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
      
      await db.transaction(async () => {
        if (email_subject !== undefined) await stmt.run('email_subject', email_subject);
        if (email_body !== undefined) await stmt.run('email_body', email_body);
        if (recommended_tags !== undefined) await stmt.run('recommended_tags', recommended_tags);
        if (quotation_packages !== undefined) await stmt.run('quotation_packages', quotation_packages);
        if (quotation_illustrators !== undefined) await stmt.run('quotation_illustrators', quotation_illustrators);
        if (quotation_addons !== undefined) await stmt.run('quotation_addons', quotation_addons);
        if (quotation_independent_addons !== undefined) await stmt.run('quotation_independent_addons', quotation_independent_addons);
        if (quotation_certificates !== undefined) await stmt.run('quotation_certificates', quotation_certificates);
        if (quotation_terms !== undefined) await stmt.run('quotation_terms', quotation_terms);
        if (wedding_form_image_a !== undefined) await stmt.run('wedding_form_image_a', wedding_form_image_a);
        if (wedding_form_image_b !== undefined) await stmt.run('wedding_form_image_b', wedding_form_image_b);
        if (wedding_form_image_c !== undefined) await stmt.run('wedding_form_image_c', wedding_form_image_c);
      })();
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM templates ORDER BY created_at ASC");
      const templates = await stmt.all();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/templates", authenticateToken, upload.single("file"), async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Template file is required" });
      }
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Template name is required" });
      }

      const id = Date.now().toString();
      const filename = `template-${id}.pdf`;
      const bucketName = process.env.R2_BUCKET!;

      try {
        await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: filename,
          Body: file.buffer,
          ContentType: 'application/pdf',
        }));
      } catch (s3Error: any) {
        console.error("S3 Upload Error:", s3Error);
        return res.status(500).json({ error: "Error uploading file to storage" });
      }

      const stmt = db.prepare("INSERT INTO templates (id, name, filename, filename_back) VALUES (?, ?, ?, ?)");
      await stmt.run(id, name, filename, null);

      res.json({ success: true, id, name, filename });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/templates/:id", authenticateToken, upload.single("file"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Template name is required" });

      const file = req.file;

      const currentTemplate = await db.prepare("SELECT * FROM templates WHERE id = ?").get(id) as any;
      if (!currentTemplate) return res.status(404).json({ error: "Template not found" });

      let newFilename = currentTemplate.filename;

      if (file) {
        newFilename = file.filename;
      }

      const stmt = db.prepare("UPDATE templates SET name = ?, filename = ?, filename_back = ? WHERE id = ?");
      await stmt.run(name, newFilename, null, id);
      res.json({ success: true, id, name, filename: newFilename });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/templates/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const getStmt = db.prepare("SELECT filename FROM templates WHERE id = ?");
      const template = await getStmt.get(id) as any;
      if (template?.filename) {
         try {
           await s3.send(new DeleteObjectCommand({
             Bucket: process.env.R2_BUCKET!,
             Key: template.filename,
           }));
         } catch (e) {
           console.error("Failed to delete from S3:", e);
         }
      }
      const stmt = db.prepare("DELETE FROM templates WHERE id = ?");
      await stmt.run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/weddings/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("DELETE FROM weddings WHERE id = ?");
      await stmt.run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- New Order Workflow Endpoints ---

  // 1. Admin creates a new order manually
  app.post("/api/orders", authenticateToken, async (req, res) => {
    try {
      const {
        template_id,
        contact_source,
        social_id,
        designer_id,
        payment_date,
        amount,
        design_deadline,
        delivery_date,
        invitation_quantity,
        wax_seal_style,
        wax_seal_color,
        envelope_color,
        envelope_foil_position,
        envelope_logo,
        processing_options,
        order_type,
        notes
      } = req.body;

      // Generate a unique order code (e.g., 8 random uppercase alphanumeric characters)
      const order_code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const stmt = db.prepare(`
        INSERT INTO weddings (
          template_id, contact_source, social_id, designer_id,
          payment_date, amount, design_deadline, delivery_date,
          invitation_quantity, wax_seal_style, wax_seal_color,
          envelope_color, envelope_foil_position, envelope_logo,
          processing_options, order_code, status, order_type, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '等待填寫資料', ?, ?)
      `);

      const info = await stmt.run(
        template_id, contact_source, social_id, designer_id || null,
        payment_date, amount, design_deadline, delivery_date,
        invitation_quantity, wax_seal_style, wax_seal_color,
        envelope_color, envelope_foil_position, envelope_logo,
        processing_options, order_code, order_type || 'invitation', notes
      );

      res.json({ success: true, id: info.lastInsertRowid, order_code });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 1.5 Duplicate an order
  app.post("/api/orders/:id/duplicate", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await db.prepare("SELECT * FROM weddings WHERE id = ?").get(id) as any;
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Generate a new unique order code
      const new_order_code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Remove fields that shouldn't be copied exactly or are auto-generated
      delete order.id;
      delete order.created_at;
      delete order.updated_at;
      
      // Update specific fields for the new order
      order.order_code = new_order_code;
      order.status = '等待填寫資料';

      const keys = Object.keys(order);
      const values = Object.values(order);
      const placeholders = keys.map(() => '?').join(', ');

      const stmt = db.prepare(`
        INSERT INTO weddings (${keys.join(', ')})
        VALUES (${placeholders})
      `);

      const info = await stmt.run(...values);

      res.json({ success: true, id: info.lastInsertRowid, order_code: new_order_code });
    } catch (error: any) {
      console.error("Error duplicating order:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Get order details by order_code for the customer form
  app.get("/api/orders/code/:orderCode", async (req, res) => {
    try {
      const { orderCode } = req.params;
      const stmt = db.prepare("SELECT * FROM weddings WHERE order_code = ?");
      const order = await stmt.get(orderCode);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Customer submits their details
  app.post("/api/orders/code/:orderCode/details", async (req, res) => {
    try {
      const { orderCode } = req.params;
      const {
        groom_name_zh, groom_name_en, bride_name_zh, bride_name_en,
        wedding_date, wedding_time, venue_name, venue_address,
        groom_father_name, groom_mother_name, bride_father_name, bride_mother_name,
        grandparents_names, schedule_tea_ceremony, schedule_wedding_ceremony,
        schedule_welcome_reception, schedule_lunch_banquet, schedule_dinner_banquet, schedule_seeing_off,
        envelope_sender_address, receiver_name, receiver_phone, receiver_address,
        email, schedule_unconfirmed,
        invitation_quantity, envelope_color, envelope_foil_position, envelope_logo,
        wax_seal_style, wax_seal_color
      } = req.body;

      const stmt = db.prepare(`
        UPDATE weddings SET
          groom_name_zh = ?, groom_name_en = ?, bride_name_zh = ?, bride_name_en = ?,
          wedding_date = ?, wedding_time = ?, venue_name = ?, venue_address = ?,
          groom_father_name = ?, groom_mother_name = ?, bride_father_name = ?, bride_mother_name = ?,
          grandparents_names = ?, schedule_tea_ceremony = ?, schedule_wedding_ceremony = ?,
          schedule_welcome_reception = ?, schedule_lunch_banquet = ?, schedule_dinner_banquet = ?, schedule_seeing_off = ?,
          envelope_sender_address = ?, receiver_name = ?, receiver_phone = ?, receiver_address = ?,
          email = ?, schedule_unconfirmed = ?,
          invitation_quantity = ?, envelope_color = ?, envelope_foil_position = ?, envelope_logo = ?,
          wax_seal_style = ?, wax_seal_color = ?,
          status = '新進訂單'
        WHERE order_code = ?
      `);

      const info = await stmt.run(
        groom_name_zh, groom_name_en, bride_name_zh, bride_name_en,
        wedding_date, wedding_time, venue_name, venue_address,
        groom_father_name, groom_mother_name, bride_father_name, bride_mother_name,
        grandparents_names, schedule_tea_ceremony, schedule_wedding_ceremony,
        schedule_welcome_reception, schedule_lunch_banquet, schedule_dinner_banquet, schedule_seeing_off,
        envelope_sender_address, receiver_name, receiver_phone, receiver_address,
        email, schedule_unconfirmed ? 1 : 0,
        invitation_quantity, envelope_color, envelope_foil_position, envelope_logo,
        wax_seal_style, wax_seal_color,
        orderCode
      );

      if (info.changes === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Update order status, tracking, etc. (Admin/Designer)
  app.put("/api/orders/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // Filter out fields that shouldn't be updated directly like id, created_at
      const allowedFields = [
        'groom_name_zh', 'groom_name_en', 'bride_name_zh', 'bride_name_en',
        'wedding_date', 'wedding_time', 'venue_name', 'venue_address',
        'template_id', 'contact_source', 'social_id', 'groom_father_name',
        'groom_mother_name', 'bride_father_name', 'bride_mother_name',
        'grandparents_names', 'schedule_tea_ceremony', 'schedule_wedding_ceremony',
        'schedule_welcome_reception', 'schedule_lunch_banquet', 'schedule_dinner_banquet', 'schedule_seeing_off',
        'invitation_quantity', 'envelope_sender_address', 'receiver_name',
        'receiver_phone', 'receiver_address', 'email', 'schedule_unconfirmed',
        'wax_seal_style', 'wax_seal_color', 'envelope_color', 'envelope_foil_position',
        'envelope_logo', 'designer_id', 'status', 'tracking_number', 'payment_date',
        'amount', 'design_deadline', 'delivery_date', 'processing_options',
        'bank_last_5', 'tax', 'invoice_number', 'tags', 'notes'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      for (const key of Object.keys(data)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(data[key]);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      updateValues.push(id);
      const query = `UPDATE weddings SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await db.prepare(query).run(...updateValues);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/orders/:id/status", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await db.prepare("UPDATE weddings SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/orders/:id/tracking", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { tracking_number } = req.body;
      await db.prepare("UPDATE weddings SET tracking_number = ? WHERE id = ?").run(tracking_number, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders/:id/send-email", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { subject, body, to } = req.body;

      console.log(`[EMAIL SIMULATION] Sending email to ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);

      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: false, // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to,
          subject,
          text: body
        });
        console.log("[EMAIL] Sent successfully via SMTP");
      } catch (error) {
        console.error("[EMAIL] Error sending email:", error);
        return res.status(500).json({ error: "Failed to send email" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[EMAIL ERROR]", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/orders/:id/payment", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { payment_date, amount } = req.body;
      const tax = Math.round((amount || 0) * 0.05);
      await db.prepare("UPDATE weddings SET payment_date = ?, amount = ?, tax = ? WHERE id = ?").run(payment_date, amount, tax, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/orders/:id/dates", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { design_deadline, delivery_date } = req.body;
      await db.prepare("UPDATE weddings SET design_deadline = ?, delivery_date = ? WHERE id = ?").run(design_deadline, delivery_date, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/weddings", async (req, res) => {
    try {
      const {
        groom_name_zh,
        groom_name_en,
        bride_name_zh,
        bride_name_en,
        wedding_date,
        wedding_time,
        venue_name,
        venue_address,
        template_id,
        contact_source,
        social_id,
        groom_father_name,
        groom_mother_name,
        bride_father_name,
        bride_mother_name,
        grandparents_names,
        schedule_tea_ceremony,
        schedule_wedding_ceremony,
        schedule_welcome_reception,
        schedule_lunch_banquet,
        schedule_dinner_banquet,
        schedule_seeing_off,
        invitation_quantity,
        envelope_sender_address,
        receiver_name,
        receiver_phone,
        receiver_address,
        email,
        schedule_unconfirmed,
        wax_seal_style,
        wax_seal_color,
        envelope_color,
        envelope_foil_position,
        envelope_logo
      } = req.body;

      const stmt = db.prepare(`
        INSERT INTO weddings (
          groom_name_zh, groom_name_en, bride_name_zh, bride_name_en,
          wedding_date, wedding_time, venue_name, venue_address, template_id,
          contact_source, social_id, groom_father_name, groom_mother_name,
          bride_father_name, bride_mother_name, grandparents_names,
          schedule_tea_ceremony, schedule_wedding_ceremony, schedule_welcome_reception, schedule_lunch_banquet,
          schedule_dinner_banquet, schedule_seeing_off, invitation_quantity,
          envelope_sender_address, receiver_name, receiver_phone, receiver_address,
          email, schedule_unconfirmed, wax_seal_style, wax_seal_color,
          envelope_color, envelope_foil_position, envelope_logo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = await stmt.run(
        groom_name_zh,
        groom_name_en,
        bride_name_zh,
        bride_name_en,
        wedding_date,
        wedding_time || "",
        venue_name,
        venue_address,
        template_id,
        contact_source || "",
        social_id || "",
        groom_father_name || "",
        groom_mother_name || "",
        bride_father_name || "",
        bride_mother_name || "",
        grandparents_names || "",
        schedule_tea_ceremony || "",
        schedule_wedding_ceremony || "",
        schedule_welcome_reception || "",
        schedule_lunch_banquet || "",
        schedule_dinner_banquet || "",
        schedule_seeing_off || "",
        invitation_quantity || "",
        envelope_sender_address || "",
        receiver_name || "",
        receiver_phone || "",
        receiver_address || "",
        email || "",
        schedule_unconfirmed ? 1 : 0,
        wax_seal_style || "",
        wax_seal_color || "",
        envelope_color || "",
        envelope_foil_position || "",
        envelope_logo || ""
      );

      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Expenses Endpoints ---
  app.get("/api/expenses", authenticateToken, async (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC");
      const expenses = await stmt.all();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/expenses", authenticateToken, async (req, res) => {
    try {
      const { expense_date, item_name, amount, category, notes } = req.body;
      const stmt = db.prepare(`
        INSERT INTO expenses (expense_date, item_name, amount, category, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = await stmt.run(expense_date, item_name, amount, category, notes);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/expenses/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { expense_date, item_name, amount, category, notes } = req.body;
      const stmt = db.prepare(`
        UPDATE expenses 
        SET expense_date = ?, item_name = ?, amount = ?, category = ?, notes = ?
        WHERE id = ?
      `);
      await stmt.run(expense_date, item_name, amount, category, notes, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/expenses/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("DELETE FROM expenses WHERE id = ?");
      await stmt.run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Incomes Endpoints ---
  app.get("/api/incomes", authenticateToken, async (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM incomes ORDER BY income_date DESC");
      const incomes = await stmt.all();
      res.json(incomes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/incomes", authenticateToken, async (req, res) => {
    try {
      const { income_date, item_name, amount, tax, bank_last_5, notes, invoice_number } = req.body;
      const stmt = db.prepare(`
        INSERT INTO incomes (income_date, item_name, amount, tax, bank_last_5, notes, invoice_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = await stmt.run(income_date, item_name, amount, tax || 0, bank_last_5 || '', notes || '', invoice_number || '');
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/incomes/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { income_date, item_name, amount, tax, bank_last_5, notes, invoice_number } = req.body;
      const stmt = db.prepare(`
        UPDATE incomes 
        SET income_date = ?, item_name = ?, amount = ?, tax = ?, bank_last_5 = ?, notes = ?, invoice_number = ?
        WHERE id = ?
      `);
      await stmt.run(income_date, item_name, amount, tax || 0, bank_last_5 || '', notes || '', invoice_number || '', id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/incomes/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("DELETE FROM incomes WHERE id = ?");
      await stmt.run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Quotations API ---
  app.get("/api/quotations", authenticateToken, async (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM quotations ORDER BY created_at DESC");
      const quotations = await stmt.all();
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ error: "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM quotations WHERE id = ?");
      const quotation = await stmt.get(req.params.id);
      if (quotation) {
        res.json(quotation);
      } else {
        res.status(404).json({ error: "Quotation not found" });
      }
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ error: "Failed to fetch quotation" });
    }
  });

  app.post("/api/quotations", authenticateToken, async (req, res) => {
    try {
      const { customer_name, ig_handle, email, phone, wedding_date, delivery_date, quotation_data, total_amount, notes } = req.body;
      const stmt = db.prepare(`
        INSERT INTO quotations (customer_name, ig_handle, email, phone, wedding_date, delivery_date, quotation_data, total_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = await stmt.run(customer_name, ig_handle, email, phone, wedding_date, delivery_date, quotation_data, total_amount, notes);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error creating quotation:", error);
      res.status(500).json({ error: "Failed to create quotation" });
    }
  });

  app.put("/api/quotations/:id", authenticateToken, async (req, res) => {
    try {
      const {
        customer_name,
        ig_handle,
        email,
        phone,
        wedding_date,
        delivery_date,
        quotation_data,
        total_amount,
        notes
      } = req.body;

      const stmt = db.prepare(`
        UPDATE quotations 
        SET customer_name = ?, ig_handle = ?, email = ?, phone = ?, wedding_date = ?, delivery_date = ?, quotation_data = ?, total_amount = ?, notes = ?
        WHERE id = ?
      `);
      await stmt.run(
        customer_name,
        ig_handle,
        email,
        phone,
        wedding_date,
        delivery_date,
        quotation_data,
        total_amount,
        notes,
        req.params.id
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ error: "Failed to update quotation" });
    }
  });

  app.put("/api/quotations/:id/status", authenticateToken, async (req, res) => {
    try {
      const { status } = req.body;
      const stmt = db.prepare("UPDATE quotations SET status = ? WHERE id = ?");
      await stmt.run(status, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating quotation status:", error);
      res.status(500).json({ error: "Failed to update quotation status" });
    }
  });

  app.delete("/api/quotations/:id", authenticateToken, async (req, res) => {
    try {
      const stmt = db.prepare("DELETE FROM quotations WHERE id = ?");
      await stmt.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ error: "Failed to delete quotation" });
    }
  });

  // Marketing Email Endpoint
  app.post("/api/weddings/:id/marketing-email", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { subject, body } = req.body;
      
      const wedding = await db.prepare("SELECT * FROM weddings WHERE id = ?").get(id) as any;
      if (!wedding) {
        return res.status(404).json({ error: "Wedding not found" });
      }

      if (wedding.unsubscribed) {
        return res.status(400).json({ error: "Customer has unsubscribed" });
      }

      const email = wedding.receiver_email || wedding.email;
      if (!email) {
        return res.status(400).json({ error: "No email address found" });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: subject,
        text: body,
      };

      await transporter.sendMail(mailOptions);

      // Log the marketing email
      await db.prepare("INSERT INTO marketing_email_logs (wedding_id) VALUES (?)").run(id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending marketing email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Unsubscribe Endpoint (Public)
  app.get("/api/unsubscribe/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.prepare("UPDATE weddings SET unsubscribed = 1 WHERE id = ?").run(id);
      res.send(`
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>退訂成功</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; color: #333; }
              h1 { color: #e11d48; }
            </style>
          </head>
          <body>
            <h1>退訂成功</h1>
            <p>您已成功取消訂閱行銷通知，未來將不會再收到此類信件。</p>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send("退訂失敗，請聯絡客服。");
    }
  });

  // Toggle Unsubscribe Endpoint (Admin)
  app.put("/api/weddings/:id/unsubscribe", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { unsubscribed } = req.body;
      await db.prepare("UPDATE weddings SET unsubscribed = ? WHERE id = ?").run(unsubscribed ? 1 : 0, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update unsubscribe status" });
    }
  });

  // Get Marketing Logs Endpoint
  app.get("/api/weddings/:id/marketing-logs", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const logs = await db.prepare("SELECT * FROM marketing_email_logs WHERE wedding_id = ? ORDER BY sent_at DESC").all(id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/weddings", authenticateToken, async (req, res) => {
    try {
      const stmt = db.prepare(`
        SELECT w.*, 
               (SELECT COUNT(*) FROM marketing_email_logs m WHERE m.wedding_id = w.id AND m.sent_at >= datetime('now', '-30 days')) as marketing_count_30d,
               (SELECT MAX(sent_at) FROM marketing_email_logs m WHERE m.wedding_id = w.id) as last_marketing_sent_at
        FROM weddings w 
        ORDER BY w.created_at DESC
      `);
      const weddings = await stmt.all();
      res.json(weddings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/weddings/:id/assign", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { designer_id } = req.body;
      await db.prepare("UPDATE weddings SET designer_id = ? WHERE id = ?").run(designer_id, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/weddings/:id/status", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await db.prepare("UPDATE weddings SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/weddings/:id/download-txt", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("SELECT * FROM weddings WHERE id = ?");
      const wedding = await stmt.get(id) as any;

      if (!wedding) {
        return res.status(404).json({ error: "Wedding not found" });
      }

      const textLines = [
        `訂單編號：#${wedding.id}`,
        `聯絡來源：${wedding.contact_source || '-'}`,
        `社群帳號：${wedding.social_id || '-'}`,
        '',
        `新郎中文名：${wedding.groom_name_zh || '-'}`,
        `新郎英文名：${wedding.groom_name_en || '-'}`,
        `新娘中文名：${wedding.bride_name_zh || '-'}`,
        `新娘英文名：${wedding.bride_name_en || '-'}`,
        '',
        `婚宴日期：${wedding.wedding_date || '-'}`,
        `婚宴時間：${wedding.wedding_time || '-'}`,
        `場地名稱：${wedding.venue_name || '-'}`,
        `場地地址：${wedding.venue_address || '-'}`,
        '',
        `新郎父親：${wedding.groom_father_name || '-'}`,
        `新郎母親：${wedding.groom_mother_name || '-'}`,
        `新娘父親：${wedding.bride_father_name || '-'}`,
        `新娘母親：${wedding.bride_mother_name || '-'}`,
        `祖父母：${wedding.grandparents_names || '-'}`,
        '',
        `文定儀式：${wedding.schedule_tea_ceremony || '-'}`,
        `結婚儀式：${wedding.schedule_wedding_ceremony || '-'}`,
        `迎賓酒會：${wedding.schedule_welcome_reception || '-'}`,
        `午宴：${wedding.schedule_lunch_banquet || '-'}`,
        `晚宴：${wedding.schedule_dinner_banquet || '-'}`,
        `送客：${wedding.schedule_seeing_off || '-'}`,
        '',
        `喜帖數量：${wedding.invitation_quantity || '-'}`,
        `信封寄件人地址：${wedding.envelope_sender_address || '-'}`,
        `收件人姓名：${wedding.receiver_name || '-'}`,
        `收件人電話：${wedding.receiver_phone || '-'}`,
        `收件人地址：${wedding.receiver_address || '-'}`,
        `Email：${wedding.email || '-'}`,
        '',
        `封蠟款式：${wedding.wax_seal_style || '-'}`,
        `封蠟顏色：${wedding.wax_seal_color || '-'}`,
        `信封顏色：${wedding.envelope_color || '-'}`,
        `信封燙金位置：${wedding.envelope_foil_position || '-'}`,
        `信封 Logo：${wedding.envelope_logo || '-'}`,
        '',
        `【加工選項】`
      ];

      if (wedding.processing_options) {
        try {
          const options = JSON.parse(wedding.processing_options);
          const labels: Record<string, string> = {
            "Illustrator": "插畫",
            "Material": "卡片印刷",
            "CardsBronzing": "卡片燙金",
            "Envelope": "信封製作",
            "BackingPaper": "內襯製作",
            "Sticker": "貼紙選擇",
            "WaxStrips": "蠟條(9條1包)",
            "MarriageContract": "結婚書約",
            "Oath": "誓言本",
            "Ribbon": "緞帶",
            "Others": "其他"
          };
          for (const [key, value] of Object.entries(options)) {
            const categoryData = value as any;
            const tags: string[] = Array.isArray(categoryData) ? categoryData : (categoryData.tags || []);
            const quantity: number = categoryData.quantity || 0;
            
            if (tags.length > 0 || quantity > 0) {
              let line = `${labels[key] || key}：`;
              if (tags.length > 0) line += tags.join(', ');
              if (quantity > 0) line += ` (數量: ${quantity})`;
              textLines.push(line);
            }
          }
        } catch (e) {
          textLines.push(`解析錯誤：${wedding.processing_options}`);
        }
      } else {
        textLines.push('無');
      }

      const textContent = textLines.join('\r\n');

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      const downloadFilename = `invitation_${id}.txt`;
      res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
      res.send(textContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/weddings/:id/download", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("SELECT * FROM weddings WHERE id = ?");
      const wedding = await stmt.get(id) as any;

      if (!wedding) {
        return res.status(404).json({ error: "Wedding not found" });
      }

      // Read PDF Template
      const templateStmt = db.prepare("SELECT * FROM templates WHERE id = ?");
      const template = templateStmt.get(wedding.template_id) as any;

      if (!template) {
        return res.status(404).json({ error: "Template not found in database" });
      }

      const targetFilename = template.filename;
      
      const templatePath = path.join(DATA_DIR, "templates", targetFilename);
      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: "Template file not found" });
      }

      const existingPdfBytes = fs.readFileSync(templatePath);
      
      // Return the original PDF file without modifying it with pdf-lib.
      // This preserves the embedded Illustrator data (PieceInfo) so the text remains fully editable
      // and doesn't get converted to outlines when opened in Illustrator.
      res.setHeader("Content-Type", "application/pdf");
      const downloadFilename = `template_${targetFilename}`;
      res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
      res.send(existingPdfBytes);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve templates via S3 proxy route
  app.get("/templates/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const bucketName = process.env.R2_BUCKET!;
      
      const s3Response = await s3.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: filename,
      }));
      
      if (s3Response.ContentType) {
        res.setHeader('Content-Type', s3Response.ContentType);
      }
      if (s3Response.ContentLength) {
        res.setHeader('Content-Length', s3Response.ContentLength);
      }
      if (filename.endsWith('.svgz')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      
      const stream = s3Response.Body as NodeJS.ReadableStream;
      stream.pipe(res);
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        res.status(404).send('Not Found');
      } else {
        console.error("S3 Get Error:", error);
        res.status(500).send('Storage Error');
      }
    }
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
    app.get("*", async (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
