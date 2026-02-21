const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

router.get("/products", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("products").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/products", async (req, res) => {
  const { sku, name, unit, cost, price, stock_min } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({ sku, name, unit, cost: cost ?? 0, price: price ?? 0, stock_min: stock_min ?? 0 })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.get("/stock", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("v_product_stock").select("*").order("name");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/movements", async (req, res) => {
  const { type, reason, created_by, items } = req.body || {};
  if (!type || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "type and items required" });

  const { data: movement, error: mErr } = await supabaseAdmin
    .from("inventory_movements")
    .insert({ type, reason, created_by })
    .select("*")
    .single();

  if (mErr) return res.status(500).json({ error: mErr.message });

  const payload = items.map(it => ({
    movement_id: movement.id,
    product_id: it.product_id,
    qty: it.qty,
    unit_cost: it.unit_cost ?? 0
  }));

  const { error: iErr } = await supabaseAdmin.from("inventory_movement_items").insert(payload);
  if (iErr) return res.status(500).json({ error: iErr.message });

  res.json({ ok: true, movement_id: movement.id });
});

module.exports = router;
