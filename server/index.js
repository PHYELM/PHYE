require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const adminRoutes = require("./routes/admin");
const formsRoutes = require("./routes/forms");
const inventoryRoutes = require("./routes/inventory");
const quotesRoutes = require("./routes/quotes");
const servicesRoutes = require("./routes/services");
const salesRoutes = require("./routes/sales");
const gpsRoutes = require("./routes/gps");
const workersRoutes = require("./routes/workers");

const { supabaseAdmin } = require("./supabaseAdmin");

const app = express();

/* =========================
   DEBUG: confirma inventory router
========================= */
console.log("🔌 inventoryRoutes loaded type:", typeof inventoryRoutes);
console.log("🔌 inventoryRoutes loaded from:", require.resolve("./routes/inventory"));

/* =========================
   Headers debug (SIEMPRE arriba)
========================= */
app.use((req, res, next) => {
  res.setHeader("X-Server-File", __filename);
  next();
});

/* =========================
   CORS (Express 5 compatible)
   - NO usar app.options("*", ...)
========================= */
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://logione.onrender.com",
  "https://logione-backend.onrender.com",
];

const corsOptions = {
  origin: function (origin, callback) {
    // permite Postman/cURL sin origin
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    return callback(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// ✅ Express 5: usa regex, NO "*"
app.options(/.*/, cors(corsOptions));

/* =========================
   Parsers + logs
========================= */
app.use(express.json({ limit: "5mb" }));

app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

/* =========================
   Health
========================= */
app.get("/api/health", (req, res) => res.json({ ok: true }));

/* =========================
   API Routes
========================= */
app.use("/api/admin", adminRoutes);
app.use("/api/forms", formsRoutes);

// Inventory (con log extra)
app.use(
  "/api/inventory",
  (req, res, next) => {
    console.log("✅ HIT /api/inventory ->", req.method, req.url);
    next();
  },
  inventoryRoutes
);

app.use("/api/quotes", quotesRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/gps", gpsRoutes);
app.use("/api/workers", workersRoutes);

/* =========================
   Debug: lista rutas cargadas
========================= */
app.get("/api/__routes", (req, res) => {
  const out = [];
  const stack =
    (app._router && app._router.stack) ||
    (app.router && app.router.stack) ||
    [];

  function pushRoute(pathBase, layer) {
    if (!layer || !layer.route) return;
    const p = layer.route.path;
    const methods = Object.keys(layer.route.methods || {}).map((m) =>
      m.toUpperCase()
    );
    out.push({ path: `${pathBase}${p}`, methods });
  }

  stack.forEach((layer) => {
    if (layer.name === "router" && layer.handle && layer.handle.stack) {
      const base = layer.regexp?.toString?.() || "";
      let basePretty = "";

      if (base.includes("\\/api\\/admin")) basePretty = "/api/admin";
      else if (base.includes("\\/api\\/forms")) basePretty = "/api/forms";
      else if (base.includes("\\/api\\/inventory")) basePretty = "/api/inventory";
      else if (base.includes("\\/api\\/quotes")) basePretty = "/api/quotes";
      else if (base.includes("\\/api\\/services")) basePretty = "/api/services";
      else if (base.includes("\\/api\\/sales")) basePretty = "/api/sales";
      else if (base.includes("\\/api\\/gps")) basePretty = "/api/gps";
      else if (base.includes("\\/api\\/workers")) basePretty = "/api/workers";

      layer.handle.stack.forEach((l2) => pushRoute(basePretty, l2));
    } else {
      pushRoute("", layer);
    }
  });

  res.json({ routes: out });
});

/* =========================
   Login interno
========================= */
app.post("/api/login", async (req, res) => {
  try {
    const rawUser = req.body?.username ?? "";
    const rawPass = req.body?.password ?? "";

    const username = String(rawUser).trim().toLowerCase();
    const password = String(rawPass).trim();

    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const { data, error } = await supabaseAdmin
      .from("workers")
      .select(
        `
        id,
        username,
        password_plain,
        full_name,
        profile_photo_url,
        active,
        department_id,
        level_id,
        department:departments!workers_department_id_fkey(name),
        level:worker_levels!workers_level_id_fkey(name)
      `
      )
      .eq("username", username)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    if (!data || !data.active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const dbPass = String(data.password_plain ?? "").trim();
    if (dbPass !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.json({
      worker: {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        profile_photo_url: data.profile_photo_url || "",
        department_id: data.department_id,
        level_id: data.level_id,
        department_name: data.department?.name || "",
        level_name: data.level?.name || "",
      },
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return res.status(500).json({ error: e.message });
  }
});

/* =========================
   404 DEBUG SOLO PARA /api
   (IMPORTANTE: antes de servir React)
========================= */
app.use("/api", (req, res) => {
  return res.status(404).json({
    error: "API route not found",
    method: req.method,
    path: req.originalUrl,
    server_file: __filename,
  });
});

/* =========================
   Servir React (CRA build)
========================= */
const webBuild = path.join(__dirname, "..", "web", "build");
app.use(express.static(webBuild));

// Catch-all SPA (NO tocar /api)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(webBuild, "index.html"));
});

/* =========================
   Start
========================= */
const port = Number(process.env.PORT || 3001);
app.listen(port, "0.0.0.0", () => console.log("Server running on port", port));