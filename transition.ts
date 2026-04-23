import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

console.log('Original length:', content.length);

// Basic replacements
content = content.replace('import Database from "better-sqlite3";', 'import { Pool } from "pg";\nimport { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";\nimport { getSignedUrl } from "@aws-sdk/s3-request-presigner";\nimport crypto from "crypto";');

content = content.replace(/const db = new Database([^;]+);/g, `const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  }
});

class DB {
  constructor(pool) {
    this.pool = pool;
  }
  async exec(sql) {
    return this.pool.query(sql);
  }
  prepare(sql) {
    let pgSql = sql;
    let i = 1;
    while(pgSql.includes('?')) {
      pgSql = pgSql.replace('?', '$' + i);
      i++;
    }
    return {
      run: async (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await this.pool.query(pgSql, params);
        return { lastInsertRowid: res.rows[0]?.id || 0, changes: res.rowCount };
      },
      get: async (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await this.pool.query(pgSql, params);
        return res.rows[0];
      },
      all: async (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await this.pool.query(pgSql, params);
        return res.rows;
      }
    };
  }
  async transaction(fn) {
    return async (...args) => {
      // simplified fake transaction for now
      return fn(...args);
    };
  }
}
const db = new DB(pool);
`);

// Replace SQLite types with Postgres types
content = content.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
content = content.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

// Remove PRAGMA
content = content.replace(/const columns = db\.prepare\("PRAGMA table_info\(weddings\)"\)\.all\(\) as any\[\];[\s\S]*?for \(const col of newColumns\) \{[\s\S]*?\}\n\s*\}/, '/* Migration handled differently or skipped */');
content = content.replace(/const incomeColumns = db\.prepare\("PRAGMA table_info\(incomes\)"\)\.all\(\) as any\[\];\n\s*const incomeColumnNames = incomeColumns\.map\(c => c\.name\);\n\s*if \(\!incomeColumnNames\.includes\('invoice_number'\)\) \{\n\s*db\.exec\("ALTER TABLE incomes ADD COLUMN invoice_number TEXT"\);\n\s*\}/, '/* Migration skipped */');
content = content.replace(/const quotationCols = db\.pragma\("table_info\(quotations\)"\) as any\[\];\n\s*if \(\!quotationCols\.some\(c => c\.name === 'notes'\)\) \{\n\s*db\.exec\("ALTER TABLE quotations ADD COLUMN notes TEXT"\);\n\s*\}/, '/* Migration skipped */');
content = content.replace(/const designerColumns = db\.prepare\("PRAGMA table_info\(designers\)"\)\.all\(\) as any\[\];\n\s*const hasRole = designerColumns\.some\(c => c\.name === 'role'\);\n\s*if \(\!hasRole\) \{\n\s*db\.prepare\("ALTER TABLE designers ADD COLUMN role TEXT DEFAULT 'designer'"\)\.run\(\);\n\s*\}/, '/* Migration skipped */');

content = content.replace(/db\.exec\(\`/g, 'await db.exec(`');
content = content.replace(/db\.exec\("/g, 'await db.exec("');

// Write out the file
fs.writeFileSync('server2.ts', content);
console.log('done preliminary rewrite');
