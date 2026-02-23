const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");
console.log("🧩 LOADED inventory routes from:", __filename);
console.log("🧩 inventory routes has:", {
  ping: "/ping",
  products: "/products",
  stock: "/stock",
  analytics: "/analytics",
  activity: "/activity",
  topStock: "/top-stock",
  topIn: "/top-in",
  topOut: "/top-out",
  topValued: "/top-valued",
});
// ✅ DEBUG: confirma que el router está montado y accesible
router.get("/ping", (req, res) => {
  res.json({ ok: true, route: "/api/inventory/ping" });
});

/* =========================
   Realtime (SSE) - Inventory
   - Frontend se conecta a /api/inventory/stream
   - Backend emite eventos cuando hay cambios (movimientos/productos)
========================= */
const SSE_CLIENTS = new Set();

function sseSend(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of SSE_CLIENTS) {
    try { res.write(msg); } catch (e) {}
  }
}

router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Si estás detrás de proxy (Render), ayuda a que no se “cuelgue”
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: "HELLO", ts: Date.now() })}\n\n`);

  SSE_CLIENTS.add(res);

  req.on("close", () => {
    SSE_CLIENTS.delete(res);
  });
});
/* =========================
   Helpers
========================= */
async function getActorSnapshot(workerId) {
  if (!workerId) return null;

  const { data, error } = await supabaseAdmin
    .from("workers")
    .select(`
      id,
      username,
      full_name,
      profile_photo_url,
      department:departments!workers_department_id_fkey(name)
    `)
    .eq("id", workerId)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;

  return {
    actor_id: data.id,
    actor_username: data.username || "",
    actor_full_name: data.full_name || data.username || "",
    actor_department: data.department?.name || "",
    actor_profile_photo_url: data.profile_photo_url || ""
  };
}

async function logActivity(payload) {
  // payload: {module_key, action, actor_id, entity_type, entity_id, meta}
  const snap = await getActorSnapshot(payload.actor_id);

  const insert = {
    module_key: payload.module_key,
    action: payload.action,
    actor_id: payload.actor_id || null,
    actor_username: snap?.actor_username || "",
    actor_full_name: snap?.actor_full_name || "",
    actor_department: snap?.actor_department || "",
    actor_profile_photo_url: snap?.actor_profile_photo_url || "",
    entity_type: payload.entity_type || null,
    entity_id: payload.entity_id || null,
    meta: payload.meta || {}
  };

  await supabaseAdmin.from("activity_log").insert(insert);
}

/* =========================
   Products
========================= */
router.get("/products", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("products").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/products", async (req, res) => {
  const { sku, name, unit, cost, price, stock_min, created_by } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({ sku, name, unit, cost: cost ?? 0, price: price ?? 0, stock_min: stock_min ?? 0 })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ✅ activity
  await logActivity({
    module_key: "inventory",
    action: "PRODUCT_CREATED",
    actor_id: created_by || null,
    entity_type: "product",
    entity_id: data.id,
    meta: { sku: sku || "", name }
  });

  // ✅ realtime push
  sseSend({ type: "PRODUCT_CREATED", product_id: data.id, ts: Date.now() });

  res.json({ data });
});

/* =========================
   Stock
========================= */
router.get("/stock", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("v_product_stock").select("*").order("name");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

/* =========================
   Movements (IN/OUT)
========================= */
router.post("/movements", async (req, res) => {
  const { type, reason, created_by, items } = req.body || {};
  if (!type || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "type and items required" });
  }
  if (!["IN", "OUT"].includes(type)) {
    return res.status(400).json({ error: "type must be IN or OUT" });
  }

  // 1) crear movimiento
  const { data: movement, error: mErr } = await supabaseAdmin
    .from("inventory_movements")
    .insert({ type, reason, created_by })
    .select("*")
    .single();

  if (mErr) return res.status(500).json({ error: mErr.message });

  // 2) items
  const payload = items.map((it) => ({
    movement_id: movement.id,
    product_id: it.product_id,
    qty: it.qty,
    unit_cost: it.unit_cost ?? 0
  }));

  const { error: iErr } = await supabaseAdmin.from("inventory_movement_items").insert(payload);
  if (iErr) return res.status(500).json({ error: iErr.message });

  // 3) meta para historial (totales)
  const total_items = payload.length;
  const total_qty = payload.reduce((a, x) => a + Number(x.qty || 0), 0);
  const total_value = payload.reduce((a, x) => a + Number(x.qty || 0) * Number(x.unit_cost || 0), 0);

  // ✅ activity feed (con foto, depto, fecha)
  await logActivity({
    module_key: "inventory",
    action: "MOVEMENT_CREATED",
    actor_id: created_by || null,
    entity_type: "inventory_movement",
    entity_id: movement.id,
    meta: {
      type,
      reason: reason || "",
      total_items,
      total_qty,
      total_value
    }
  });

  // ✅ realtime push
  sseSend({
    type: "MOVEMENT_CREATED",
    movement_id: movement.id,
    meta: { type, total_items, total_qty, total_value },
    ts: Date.now()
  });

  res.json({ ok: true, movement_id: movement.id });
});

/* =========================
   Kardex (detalle)
========================= */
router.get("/kardex", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const { data, error } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

/* =========================
   Analytics (rendimiento)
   - devuelve series día -> qty/value IN/OUT
========================= */
router.get("/analytics", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 7), 365);

  // trae últimos N días (vista ya está agregada por day)
  const { data, error } = await supabaseAdmin
    .from("v_inventory_perf")
    .select("*")
    .order("day", { ascending: false })
    .limit(days);

  if (error) return res.status(500).json({ error: error.message });

  // invierte para graficar ascendente
  res.json({ data: (data || []).reverse() });
});
/* =========================
   TOP endpoints (dashboard pro)
   - /top-stock  -> productos con más stock (v_product_stock)
   - /top-in     -> productos con mayor qty IN (N días)
   - /top-out    -> productos con mayor qty OUT (N días)
   - /top-valued -> productos con mayor $ movido (qty*unit_cost) (N días)
========================= */

router.get("/top-stock", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 8), 50);

  const { data, error } = await supabaseAdmin
    .from("v_product_stock")
    .select("product_id, sku, name, stock")
    .order("stock", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: data || [] });
});

router.get("/top-in", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 8), 50);
  const days = Math.min(Math.max(Number(req.query.days || 30), 7), 365);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // v_inventory_kardex: type, product_name, sku, qty, unit_cost, line_total, created_at...
  const { data, error } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("product_id, sku, product_name, qty")
    .eq("type", "IN")
    .gte("created_at", since);

  if (error) return res.status(500).json({ error: error.message });

  const map = new Map();
  for (const r of data || []) {
    const id = r.product_id;
    const prev = map.get(id) || { product_id: id, sku: r.sku || "", name: r.product_name || "", qty: 0 };
    prev.qty += Number(r.qty || 0);
    map.set(id, prev);
  }

  const out = Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);

  res.json({ data: out });
});

router.get("/top-out", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 8), 50);
  const days = Math.min(Math.max(Number(req.query.days || 30), 7), 365);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("product_id, sku, product_name, qty")
    .eq("type", "OUT")
    .gte("created_at", since);

  if (error) return res.status(500).json({ error: error.message });

  const map = new Map();
  for (const r of data || []) {
    const id = r.product_id;
    const prev = map.get(id) || { product_id: id, sku: r.sku || "", name: r.product_name || "", qty: 0 };
    prev.qty += Number(r.qty || 0);
    map.set(id, prev);
  }

  const out = Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);

  res.json({ data: out });
});

router.get("/top-valued", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 8), 50);
  const days = Math.min(Math.max(Number(req.query.days || 30), 7), 365);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("product_id, sku, product_name, qty, unit_cost")
    .gte("created_at", since);

  if (error) return res.status(500).json({ error: error.message });

  const map = new Map();
  for (const r of data || []) {
    const id = r.product_id;
    const prev = map.get(id) || { product_id: id, sku: r.sku || "", name: r.product_name || "", value: 0, qty: 0 };
    const qty = Number(r.qty || 0);
    const cost = Number(r.unit_cost || 0);
    prev.qty += qty;
    prev.value += qty * cost;
    map.set(id, prev);
  }

  const out = Array.from(map.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  res.json({ data: out });
});
/* =========================
   Activity feed (historial)
========================= */
router.get("/activity", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 25), 100);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const { data, error } = await supabaseAdmin
    .from("activity_log")
    .select("*")
    .eq("module_key", "inventory")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

module.exports = router;