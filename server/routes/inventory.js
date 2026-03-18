const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

const INVENTORY_ROUTE_VERSION = "inventory-router-v2-performance-summary";

console.log("🧩 LOADED inventory routes from:", __filename);
console.log("🧩 inventory route version:", INVENTORY_ROUTE_VERSION);
console.log("🧩 inventory routes has:", {
  ping: "/ping",
  routeVersion: INVENTORY_ROUTE_VERSION,
  products: "/products",
  stock: "/stock",
  stockMovements: "/stock/:productId/movements",
  kardex: "/kardex",
  analytics: "/analytics",
  metrics: "/metrics",
  performanceSummary: "/performance-summary",
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
router.get("/route-version", (req, res) => {
  res.json({
    ok: true,
    route: "/api/inventory/route-version",
    version: INVENTORY_ROUTE_VERSION,
    file: __filename,
    ts: Date.now(),
  });
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
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});


router.post("/products", async (req, res) => {
  const { sku, name, unit, cost, price, stock_min, created_by } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      sku,
      name,
      unit,
      cost: cost ?? 0,
      price: price ?? 0,
      stock_min: stock_min ?? 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await logActivity({
    module_key: "inventory",
    action: "PRODUCT_CREATED",
    actor_id: created_by || null,
    entity_type: "product",
    entity_id: data.id,
    meta: { sku: sku || "", name }
  });

  sseSend({ type: "PRODUCT_CREATED", product_id: data.id, ts: Date.now() });

  res.json({ data });
});
router.delete("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const { deleted_by } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: "product id required" });
    }

    const { data: existingProduct, error: existingError } = await supabaseAdmin
      .from("products")
      .select("id, name, sku, is_active")
      .eq("id", productId)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { error: archiveError } = await supabaseAdmin
      .from("products")
      .update({ is_active: false })
      .eq("id", productId);

    if (archiveError) {
      return res.status(500).json({ error: archiveError.message });
    }

    await logActivity({
      module_key: "inventory",
      action: "PRODUCT_DELETED",
      actor_id: deleted_by || null,
      entity_type: "product",
      entity_id: productId,
      meta: {
        sku: existingProduct.sku || "",
        name: existingProduct.name || "",
      },
    });

    sseSend({
      type: "PRODUCT_DELETED",
      product_id: productId,
      ts: Date.now(),
    });

    return res.json({
      ok: true,
      message: "Producto eliminado correctamente",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
/* =========================
   Stock
========================= */
router.get("/stock", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("v_product_stock").select("*").order("name");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});
router.get("/stock/:productId/movements", async (req, res) => {
  const { productId } = req.params;
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  if (!productId) {
    return res.status(400).json({ error: "productId required" });
  }

  const { data, error } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({
      error: error.message,
      route: "/api/inventory/stock/:productId/movements",
      productId,
    });
  }

  return res.json({
    ok: true,
    route: "/api/inventory/stock/:productId/movements",
    productId,
    data: data || [],
  });
});

/* ✅ Alias plano enriquecido para detalle visual del historial */
router.get("/stock-movements/:productId", async (req, res) => {
  const { productId } = req.params;
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  if (!productId) {
    return res.status(400).json({ error: "productId required" });
  }

  const { data, error } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({
      error: error.message,
      route: "/api/inventory/stock-movements/:productId",
      productId,
    });
  }

  const rows = data || [];
  const movementIds = Array.from(
    new Set(rows.map((r) => r.movement_id).filter(Boolean))
  );

  let movementMap = new Map();
  let workerMap = new Map();

  if (movementIds.length) {
    const { data: movementRows, error: movementErr } = await supabaseAdmin
      .from("inventory_movements")
      .select("id, created_by, created_at, type, reason")
      .in("id", movementIds);

    if (movementErr) {
      return res.status(500).json({
        error: movementErr.message,
        route: "/api/inventory/stock-movements/:productId",
        productId,
      });
    }

    const createdByIds = Array.from(
      new Set((movementRows || []).map((m) => m.created_by).filter(Boolean))
    );

    movementMap = new Map(
      (movementRows || []).map((m) => [String(m.id), m])
    );

    if (createdByIds.length) {
      const { data: workerRows, error: workerErr } = await supabaseAdmin
        .from("workers")
        .select(`
          id,
          username,
          full_name,
          profile_photo_url,
          department:departments!workers_department_id_fkey(name)
        `)
        .in("id", createdByIds);

      if (workerErr) {
        return res.status(500).json({
          error: workerErr.message,
          route: "/api/inventory/stock-movements/:productId",
          productId,
        });
      }

      workerMap = new Map(
        (workerRows || []).map((w) => [String(w.id), w])
      );
    }
  }

  const enriched = rows.map((row) => {
    const movement = movementMap.get(String(row.movement_id || "")) || null;
    const worker = workerMap.get(String(movement?.created_by || "")) || null;

    return {
      ...row,
      actor_id: worker?.id || movement?.created_by || null,
      actor_username: worker?.username || "",
      actor_full_name: worker?.full_name || worker?.username || "",
      actor_department: worker?.department?.name || "",
      actor_profile_photo_url: worker?.profile_photo_url || "",
      movement_reason: movement?.reason || row.reason || "",
      movement_type: movement?.type || row.type || "",
      movement_created_at: movement?.created_at || row.created_at || null,
    };
  });

  return res.json({
    ok: true,
    route: "/api/inventory/stock-movements/:productId",
    productId,
    data: enriched,
  });
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

  // normaliza items (seguro)
  const cleanItems = items
    .map((it) => ({
      product_id: it.product_id,
      qty: Number(it.qty || 0),
      unit_cost: Number(it.unit_cost || 0),
    }))
    .filter((x) => x.product_id && x.qty > 0);

  if (cleanItems.length === 0) {
    return res.status(400).json({ error: "items must include product_id and qty > 0" });
  }

  /* =========================
     ✅ VALIDACIÓN STOCK (solo OUT)
     - si quieren sacar más de lo que hay => 400
  ========================= */
  let stockById = new Map();

  if (type === "OUT") {
    const ids = Array.from(new Set(cleanItems.map((x) => x.product_id)));

    const { data: stocks, error: sErr } = await supabaseAdmin
      .from("v_product_stock")
      .select("product_id, stock, name, sku")
      .in("product_id", ids);

    if (sErr) return res.status(500).json({ error: sErr.message });

    (stocks || []).forEach((r) => {
      stockById.set(String(r.product_id), {
        stock: Number(r.stock || 0),
        name: r.name || "",
        sku: r.sku || "",
      });
    });

    // revisa insuficientes
    const insufficient = [];
    for (const it of cleanItems) {
      const snap = stockById.get(String(it.product_id)) || { stock: 0, name: "", sku: "" };
      if (it.qty > snap.stock) {
        insufficient.push({
          product_id: it.product_id,
          name: snap.name,
          sku: snap.sku,
          available: snap.stock,
          requested: it.qty,
        });
      }
    }

    if (insufficient.length) {
      return res.status(400).json({
        error: "INSUFFICIENT_STOCK",
        message: "No hay stock suficiente para completar la salida.",
        details: insufficient,
      });
    }
  }

  /* =========================
     1) crear movimiento
  ========================= */
  const { data: movement, error: mErr } = await supabaseAdmin
    .from("inventory_movements")
    .insert({ type, reason, created_by })
    .select("*")
    .single();

  if (mErr) return res.status(500).json({ error: mErr.message });

  /* =========================
     2) items
  ========================= */
  const payload = cleanItems.map((it) => ({
    movement_id: movement.id,
    product_id: it.product_id,
    qty: it.qty,
    unit_cost: it.unit_cost ?? 0,
  }));

  const { error: iErr } = await supabaseAdmin
    .from("inventory_movement_items")
    .insert(payload);

  if (iErr) return res.status(500).json({ error: iErr.message });

  /* =========================
     3) meta / activity
  ========================= */
  const total_items = payload.length;
  const total_qty = payload.reduce((a, x) => a + Number(x.qty || 0), 0);
  const total_value = payload.reduce(
    (a, x) => a + Number(x.qty || 0) * Number(x.unit_cost || 0),
    0
  );

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
      total_value,
    },
  });

  /* =========================
     ✅ LOW STOCK ALERT (solo OUT)
     - si queda <= 10: manda SSE a TODOS los conectados
  ========================= */
  if (type === "OUT") {
    for (const it of cleanItems) {
      const snap = stockById.get(String(it.product_id)) || { stock: 0, name: "", sku: "" };
      const remaining = Math.max(0, Number(snap.stock || 0) - Number(it.qty || 0));

      if (remaining <= 10) {
        sseSend({
          type: "LOW_STOCK",
          product_id: it.product_id,
          name: snap.name,
          sku: snap.sku,
          remaining,
          ts: Date.now(),
        });
      }
    }
  }

  /* =========================
     realtime push general
  ========================= */
  sseSend({
    type: "MOVEMENT_CREATED",
    movement_id: movement.id,
    meta: { type, total_items, total_qty, total_value },
    ts: Date.now(),
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
   Metrics (Rendimientos PRO)
   - Rotación de inventario (aprox)
   - Margen bruto por producto
   - Entradas vs salidas (qty/value)
   - Valor total inventario (hoy)
   - Utilidad estimada del periodo (OUT * (price - costBase))
========================= */
router.get("/metrics", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 7), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1) productos (cost/price)
  const { data: prod, error: pErr } = await supabaseAdmin
    .from("products")
    .select("id, name, sku, cost, price");
  if (pErr) return res.status(500).json({ error: pErr.message });

  const prodById = new Map();
  (prod || []).forEach((p) => {
    prodById.set(String(p.id), {
      id: p.id,
      name: p.name || "",
      sku: p.sku || "",
      cost: Number(p.cost || 0),
      price: Number(p.price || 0),
    });
  });

  // 2) stock actual
  const { data: st, error: sErr } = await supabaseAdmin
    .from("v_product_stock")
    .select("product_id, stock");
  if (sErr) return res.status(500).json({ error: sErr.message });

  let totalInventoryValue = 0;
  for (const r of st || []) {
    const info = prodById.get(String(r.product_id));
    const qty = Number(r.stock || 0);
    const unitCost = Number(info?.cost || 0);
    totalInventoryValue += qty * unitCost;
  }

  // 3) kardex periodo
  const { data: kx, error: kErr } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("type, product_id, sku, product_name, qty, unit_cost, created_at")
    .gte("created_at", since);

  if (kErr) return res.status(500).json({ error: kErr.message });

  let qtyIn = 0, qtyOut = 0, valIn = 0, valOut = 0;

  // por producto: margen y utilidad
  const perProduct = new Map();

  for (const r of kx || []) {
    const pid = String(r.product_id || "");
    const qty = Number(r.qty || 0);
    const uc = Number(r.unit_cost || 0);
    const info = prodById.get(pid);

    const price = Number(info?.price || 0);
    const fallbackCost = Number(info?.cost || 0);
    const costBase = uc > 0 ? uc : fallbackCost;

    if (r.type === "IN") {
      qtyIn += qty;
      valIn += qty * costBase;
    } else if (r.type === "OUT") {
      qtyOut += qty;
      valOut += qty * costBase;

      // utilidad estimada si ese OUT representa venta/consumo valorizado
      const profit = qty * Math.max(0, price - costBase);

      const prev = perProduct.get(pid) || {
        product_id: r.product_id,
        sku: r.sku || info?.sku || "",
        name: r.product_name || info?.name || "",
        qty_out: 0,
        revenue_est: 0,
        cogs_est: 0,
        profit_est: 0,
        margin_pct: 0,
      };

      prev.qty_out += qty;
      prev.revenue_est += qty * price;
      prev.cogs_est += qty * costBase;
      prev.profit_est += profit;

      // margen bruto %
      prev.margin_pct = prev.revenue_est > 0 ? ((prev.revenue_est - prev.cogs_est) / prev.revenue_est) * 100 : 0;

      perProduct.set(pid, prev);
    }
  }

  const flow = {
    qty_in: qtyIn,
    qty_out: qtyOut,
    value_in: valIn,
    value_out: valOut,
  };

  // utilidad periodo (sum OUT)
  const profitPeriod = Array.from(perProduct.values()).reduce((a, x) => a + Number(x.profit_est || 0), 0);

  // top margen por producto (por % y con volumen)
  const topMargin = Array.from(perProduct.values())
    .filter((x) => Number(x.qty_out || 0) > 0)
    .sort((a, b) => (b.margin_pct - a.margin_pct) || (b.profit_est - a.profit_est))
    .slice(0, 10);

  // rotación aproximada = COGS periodo / valor inventario actual
  // (sin inventario promedio histórico, es aproximación práctica)
  const rotation = totalInventoryValue > 0 ? (valOut / totalInventoryValue) : 0;

  res.json({
    data: {
      days,
      rotation,
      total_inventory_value: totalInventoryValue,
      profit_period_est: profitPeriod,
      flow,
      top_margin_products: topMargin,
    },
  });
});

/* =========================
   Performance Summary (Rendimientos PRO)
   - Salud operativa
   - Capital inmovilizado
   - Cobertura
   - Riesgo
   - Top rotación / margen
========================= */
router.get("/performance-summary", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 7), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: prod, error: pErr } = await supabaseAdmin
    .from("products")
    .select("id, name, sku, cost, price, stock_min");

  if (pErr) return res.status(500).json({ error: pErr.message });

  const { data: stockRows, error: sErr } = await supabaseAdmin
    .from("v_product_stock")
    .select("product_id, name, sku, stock, stock_min, is_low_stock");

  if (sErr) return res.status(500).json({ error: sErr.message });

  const { data: kardexRows, error: kErr } = await supabaseAdmin
    .from("v_inventory_kardex")
    .select("type, product_id, sku, product_name, qty, unit_cost, created_at")
    .gte("created_at", since);

  if (kErr) return res.status(500).json({ error: kErr.message });

  const prodById = new Map();
  (prod || []).forEach((p) => {
    prodById.set(String(p.id), {
      id: p.id,
      name: p.name || "",
      sku: p.sku || "",
      cost: Number(p.cost || 0),
      price: Number(p.price || 0),
      stock_min: Number(p.stock_min || 0),
    });
  });

  const perfById = new Map();

  for (const row of kardexRows || []) {
    const pid = String(row.product_id || "");
    const info = prodById.get(pid);

    const prev = perfById.get(pid) || {
      product_id: row.product_id,
      sku: row.sku || info?.sku || "",
      name: row.product_name || info?.name || "",
      qty_in: 0,
      qty_out: 0,
      value_in: 0,
      value_out: 0,
      last_movement_at: row.created_at || null,
      profit_est: 0,
      margin_pct: 0,
      revenue_est: 0,
      cogs_est: 0,
    };

    const qty = Number(row.qty || 0);
    const unitCost = Number(row.unit_cost || 0);
    const fallbackCost = Number(info?.cost || 0);
    const price = Number(info?.price || 0);
    const costBase = unitCost > 0 ? unitCost : fallbackCost;

    if (row.type === "IN") {
      prev.qty_in += qty;
      prev.value_in += qty * costBase;
    }

    if (row.type === "OUT") {
      prev.qty_out += qty;
      prev.value_out += qty * costBase;
      prev.revenue_est += qty * price;
      prev.cogs_est += qty * costBase;
      prev.profit_est += qty * Math.max(0, price - costBase);
    }

    if (!prev.last_movement_at || new Date(row.created_at) > new Date(prev.last_movement_at)) {
      prev.last_movement_at = row.created_at;
    }

    prev.margin_pct =
      prev.revenue_est > 0
        ? ((prev.revenue_est - prev.cogs_est) / prev.revenue_est) * 100
        : 0;

    perfById.set(pid, prev);
  }

  let capitalImmobilized = 0;
  let avgCoverageAcc = 0;
  let avgCoverageCount = 0;

  const criticalProducts = [];
  const deadStockProducts = [];
  const overstockProducts = [];
  const lowCoverageProducts = [];
  const topRotationProducts = [];
  const productRows = [];

  let healthyCount = 0;
  let criticalCount = 0;
  let deadCount = 0;
  let overstockCount = 0;

  for (const stockRow of stockRows || []) {
    const pid = String(stockRow.product_id || "");
    const info = prodById.get(pid) || {};
    const perf = perfById.get(pid) || {
      product_id: stockRow.product_id,
      sku: stockRow.sku || info?.sku || "",
      name: stockRow.name || info?.name || "",
      qty_in: 0,
      qty_out: 0,
      value_in: 0,
      value_out: 0,
      last_movement_at: null,
      profit_est: 0,
      margin_pct: 0,
      revenue_est: 0,
      cogs_est: 0,
    };

    const stock = Number(stockRow.stock || 0);
    const stockMin = Number(stockRow.stock_min ?? info?.stock_min ?? 0);
    const cost = Number(info?.cost || 0);
    const avgDailyOut = Number(perf.qty_out || 0) / days;
    const coverageDays = avgDailyOut > 0 ? stock / avgDailyOut : null;
    const capital = stock * cost;
    const rotationScore = stock > 0 ? Number(perf.qty_out || 0) / stock : Number(perf.qty_out || 0);

    const isCritical = Boolean(stockRow.is_low_stock) || stock <= stockMin;
    const isDead = Number(perf.qty_in || 0) === 0 && Number(perf.qty_out || 0) === 0;
    const isOverstock =
      (coverageDays !== null && coverageDays > 45) ||
      (coverageDays === null && stock > Math.max(stockMin, 0) * 2 && stock > 0);
    const isLowCoverage = coverageDays !== null && coverageDays <= 7;

    if (coverageDays !== null && Number.isFinite(coverageDays)) {
      avgCoverageAcc += coverageDays;
      avgCoverageCount += 1;
    }

    if (isDead) {
      capitalImmobilized += capital;
      deadStockProducts.push({
        product_id: stockRow.product_id,
        sku: stockRow.sku || info?.sku || "",
        name: stockRow.name || info?.name || "",
        stock,
        stock_min: stockMin,
        capital_immobilized: capital,
        last_movement_at: perf.last_movement_at,
      });
    }

    if (isCritical) {
      criticalProducts.push({
        product_id: stockRow.product_id,
        sku: stockRow.sku || info?.sku || "",
        name: stockRow.name || info?.name || "",
        stock,
        stock_min: stockMin,
        coverage_days: coverageDays,
      });
    }

    if (isOverstock) {
      overstockProducts.push({
        product_id: stockRow.product_id,
        sku: stockRow.sku || info?.sku || "",
        name: stockRow.name || info?.name || "",
        stock,
        stock_min: stockMin,
        coverage_days: coverageDays,
        capital_immobilized: capital,
      });
    }

    if (isLowCoverage) {
      lowCoverageProducts.push({
        product_id: stockRow.product_id,
        sku: stockRow.sku || info?.sku || "",
        name: stockRow.name || info?.name || "",
        stock,
        stock_min: stockMin,
        coverage_days: coverageDays,
      });
    }

    topRotationProducts.push({
      product_id: stockRow.product_id,
      sku: stockRow.sku || info?.sku || "",
      name: stockRow.name || info?.name || "",
      stock,
      qty_out: Number(perf.qty_out || 0),
      rotation_score: rotationScore,
      coverage_days: coverageDays,
    });

    productRows.push({
      product_id: stockRow.product_id,
      sku: stockRow.sku || info?.sku || "",
      name: stockRow.name || info?.name || "",
      stock,
      stock_min: stockMin,
      qty_in: Number(perf.qty_in || 0),
      qty_out: Number(perf.qty_out || 0),
      value_in: Number(perf.value_in || 0),
      value_out: Number(perf.value_out || 0),
      profit_est: Number(perf.profit_est || 0),
      margin_pct: Number(perf.margin_pct || 0),
      coverage_days: coverageDays,
      capital_immobilized: capital,
      rotation_score: rotationScore,
      status: isCritical ? "Crítico" : isDead ? "Sin movimiento" : isOverstock ? "Sobrestock" : "Saludable",
    });

    if (isCritical) {
      criticalCount += 1;
    } else if (isDead) {
      deadCount += 1;
    } else if (isOverstock) {
      overstockCount += 1;
    } else {
      healthyCount += 1;
    }
  }

  const topMarginProducts = Array.from(perfById.values())
    .filter((x) => Number(x.qty_out || 0) > 0)
    .sort((a, b) => (b.margin_pct - a.margin_pct) || (b.profit_est - a.profit_est))
    .slice(0, 10);

  criticalProducts.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
  deadStockProducts.sort((a, b) => Number(b.capital_immobilized || 0) - Number(a.capital_immobilized || 0));
  overstockProducts.sort((a, b) => Number(b.capital_immobilized || 0) - Number(a.capital_immobilized || 0));
  lowCoverageProducts.sort((a, b) => Number(a.coverage_days || 999999) - Number(b.coverage_days || 999999));
  topRotationProducts.sort((a, b) => Number(b.rotation_score || 0) - Number(a.rotation_score || 0));
  productRows.sort((a, b) => Number(b.rotation_score || 0) - Number(a.rotation_score || 0));

  res.json({
    data: {
      days,
      capital_immobilized: capitalImmobilized,
      avg_coverage_days: avgCoverageCount ? (avgCoverageAcc / avgCoverageCount) : 0,
      critical_count: criticalProducts.length,
      dead_count: deadStockProducts.length,
      overstock_count: overstockProducts.length,
      low_coverage_count: lowCoverageProducts.length,
      status_buckets: {
        healthy: healthyCount,
        critical: criticalCount,
        dead: deadCount,
        overstock: overstockCount,
      },
      critical_products: criticalProducts.slice(0, 10),
      dead_stock_products: deadStockProducts.slice(0, 10),
      overstock_products: overstockProducts.slice(0, 10),
      low_coverage_products: lowCoverageProducts.slice(0, 10),
      top_rotation_products: topRotationProducts.slice(0, 10),
      top_margin_products: topMarginProducts,
      product_rows: productRows.slice(0, 50),
    },
  });
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

  const days = req.query.days ? Math.min(Math.max(Number(req.query.days || 30), 1), 365) : null;
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

  let q = supabaseAdmin
    .from("activity_log")
    .select("*")
    .eq("module_key", "inventory");

  if (since) q = q.gte("created_at", since);

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: data || [] });
});

module.exports = router;