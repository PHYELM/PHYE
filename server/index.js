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

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "5mb" }));
// ✅ DEBUG: log de cada request que llega a este server
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/admin", adminRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/quotes", quotesRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/gps", gpsRoutes);
app.use("/api/workers", workersRoutes);

/* ✅ DEBUG DEFINITIVO: lista TODAS las rutas cargadas en ESTE server */
app.get("/api/__routes", (req, res) => {
  const out = [];

  // Express 5 puede tener app.router o app._router
  const stack = (app._router && app._router.stack) || (app.router && app.router.stack) || [];

  function pushRoute(pathBase, layer) {
    if (!layer || !layer.route) return;
    const p = layer.route.path;
    const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
    out.push({ path: `${pathBase}${p}`, methods });
  }

  stack.forEach((layer) => {
    // router montado con use()
    if (layer.name === "router" && layer.handle && layer.handle.stack) {
      const base = layer.regexp?.toString?.() || "";
      // intenta inferir base (/api/admin etc) de forma humana:
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

// Login interno
app.post("/api/login", async (req, res) => {
  try {

    const rawUser = req.body?.username ?? "";
    const rawPass = req.body?.password ?? "";

    const username = String(rawUser).trim().toLowerCase(); // canon
    const password = String(rawPass).trim();               // sin espacios

    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const { data, error } = await supabaseAdmin
      .from("workers")
      .select(`
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
      `)
      .eq("username", username)
      .maybeSingle();


    if (error) return res.status(500).json({ error: error.message });

    // no existe o está inactivo
    if (!data || !data.active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ comparación ultra segura
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
        level_name: data.level?.name || ""
      }
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Servir CRA build
const webBuild = path.join(__dirname, "..", "web", "build");
app.use(express.static(webBuild));

// Catch-all SPA (NO tocar /api)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(webBuild, "index.html"));
});

const port = Number(process.env.PORT || 3001);
app.listen(port, "0.0.0.0", () => console.log("Server running on port", port));