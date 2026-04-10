const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

// ✅ DEBUG: confirma que ESTE archivo se está cargando
console.log("✅ ADMIN ROUTES LOADED:", __filename);

// ✅ DEBUG: confirma que el PUT/DELETE realmente entra al router admin
router.use((req, res, next) => {
  if (req.url.startsWith("/departments/")) {
    console.log("✅ ADMIN HIT:", req.method, req.originalUrl);
  }
  next();
});

// =====================
// Departments
// =====================
router.get("/departments", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("id, name, color, icon, created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/departments", async (req, res) => {
  const { name, color, icon } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const payload = {
    name,
    color: color ?? null,
    icon: icon ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("departments")
    .insert(payload)
    .select("id, name, color, icon, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.put("/departments/:id", async (req, res) => {
  const { id } = req.params;
  const { name, color, icon } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });
  if (!name) return res.status(400).json({ error: "name required" });

  const payload = {
    name,
    color: color ?? null,
    icon: icon ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("departments")
    .update(payload)
    .eq("id", id)
    .select("id, name, color, icon, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.delete("/departments/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id required" });

  const { error } = await supabaseAdmin
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
// =====================
// Levels (Puestos)
// authority: 1..5 (simple)
// rank se mantiene por compatibilidad
// =====================
router.get("/levels", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("worker_levels")
    .select("*")
    .order("authority", { ascending: true })
    .order("rank", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/levels", async (req, res) => {
  const { name, authority, can_approve_quotes, can_manage_calendar } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const auth = Math.max(1, Math.min(5, Number(authority || 1)));
  const rank = auth;

  const { data, error } = await supabaseAdmin
    .from("worker_levels")
    .insert({ name, authority: auth, rank, can_approve_quotes: Boolean(can_approve_quotes), can_manage_calendar: Boolean(can_manage_calendar) })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});
// UPDATE level
router.put("/levels/:id", async (req, res) => {
  const { id } = req.params;
  const { name, authority, can_approve_quotes, can_manage_calendar } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });
  if (!name) return res.status(400).json({ error: "name required" });

  const auth = Math.max(1, Math.min(5, Number(authority || 1)));
  const rank = auth;

  const { data, error } = await supabaseAdmin
    .from("worker_levels")
    .update({ name, authority: auth, rank, can_approve_quotes: Boolean(can_approve_quotes), can_manage_calendar: Boolean(can_manage_calendar) })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// DELETE level
router.delete("/levels/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id required" });

  const { error } = await supabaseAdmin
    .from("worker_levels")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
// =====================
// Workers
// =====================
router.get("/workers", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("workers")
    .select("id, username, password_plain, full_name, active, department_id, level_id, profile_photo_url, created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/workers", async (req, res) => {
  const { username, password_plain, full_name, department_id, level_id, active } = req.body || {};
  if (!username || !password_plain) return res.status(400).json({ error: "username and password_plain required" });

  const { data, error } = await supabaseAdmin
    .from("workers")
    .insert({
      username,
      password_plain,
      full_name: full_name || null,
      department_id: department_id || null,
      level_id: level_id || null,
      active: active ?? true,
    })
    .select("id, username, password_plain, full_name, active, department_id, level_id, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.put("/workers/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password_plain, full_name, department_id, level_id, active } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });
  if (!username || !password_plain) return res.status(400).json({ error: "username and password_plain required" });

  const { data, error } = await supabaseAdmin
    .from("workers")
    .update({
      username,
      password_plain,
      full_name: full_name || null,
      department_id: department_id || null,
      level_id: level_id || null,
      active: active ?? true,
    })
    .eq("id", id)
    .select("id, username, password_plain, full_name, active, department_id, level_id, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.delete("/workers/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id required" });

  const { error } = await supabaseAdmin
    .from("workers")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});


// =====================
// Access Policies (Permisos por depto + puesto)
// =====================

// GET: listar policies
router.get("/access-policies", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("access_policies")
    .select("id, department_id, level_id, allowed_modules, created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// POST: upsert por (department_id, level_id)
router.post("/access-policies", async (req, res) => {
  const { department_id, level_id, allowed_modules } = req.body || {};
  if (!department_id || !level_id) {
    return res.status(400).json({ error: "department_id and level_id required" });
  }

  const payload = {
    department_id,
    level_id,
    allowed_modules: Array.isArray(allowed_modules) ? allowed_modules : [],
  };

  const { data, error } = await supabaseAdmin
    .from("access_policies")
    .upsert(payload, { onConflict: "department_id,level_id" })
    .select("id, department_id, level_id, allowed_modules, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});
// ✅ DEBUG: lista rutas registradas en este router (para confirmar que existe access-policies)
router.get("/__routes", (req, res) => {
  const routes = [];
  router.stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
      routes.push({ path: layer.route.path, methods });
    }
  });
  res.json({ routes });
});

module.exports = router;