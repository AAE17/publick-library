const express = require("express");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "formats.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  : null;

function ensureJsonStore() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

function readJson() {
  ensureJsonStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeJson(rows) {
  ensureJsonStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

async function initDb() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS formats (
      id SERIAL PRIMARY KEY,
      district TEXT NOT NULL,
      taluka TEXT NOT NULL,
      works JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_formats_district ON formats (district)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_formats_taluka ON formats (taluka)`);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: pool ? "postgres" : "json-file" });
});

app.get("/api/formats", async (_req, res) => {
  try {
    if (pool) {
      const { rows } = await pool.query(
        "SELECT id, district, taluka, works, created_at FROM formats ORDER BY created_at DESC"
      );
      return res.json(rows);
    }
    res.json(readJson());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "read_failed" });
  }
});

app.post("/api/formats", async (req, res) => {
  const district = String(req.body.district || "").trim();
  const taluka = String(req.body.taluka || "").trim();
  const works = Array.isArray(req.body.works)
    ? req.body.works.map((w) => String(w || "").trim()).filter(Boolean).slice(0, 7)
    : [];

  if (!district || !taluka) {
    return res.status(400).json({ error: "district_and_taluka_required" });
  }

  try {
    if (pool) {
      const { rows } = await pool.query(
        "INSERT INTO formats (district, taluka, works) VALUES ($1, $2, $3::jsonb) RETURNING id, district, taluka, works, created_at",
        [district, taluka, JSON.stringify(works)]
      );
      return res.status(201).json(rows[0]);
    }
    const rows = readJson();
    const row = {
      id: Date.now(),
      district,
      taluka,
      works,
      created_at: new Date().toISOString(),
    };
    rows.unshift(row);
    writeJson(rows);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "save_failed" });
  }
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log("ASO Estimate listening on " + PORT + " db=" + (pool ? "postgres" : "json-file"));
    });
  })
  .catch((err) => {
    console.error("DB init failed", err);
    process.exit(1);
  });
