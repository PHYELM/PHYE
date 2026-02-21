const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

router.post("/", async (req, res) => {
  const { customer_id, seller_id, payment_method, items = [], tax = 0 } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items required" });

  const subtotal = items.reduce((a, it) => a + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0);
  const total = subtotal + Number(tax || 0);

  const { data: sale, error: sErr } = await supabaseAdmin
    .from("sales")
    .insert({ customer_id, seller_id, payment_method: payment_method ?? "CASH", subtotal, tax, total })
    .select("*")
    .single();

  if (sErr) return res.status(500).json({ error: sErr.message });

  const sItems = items.map(it => ({
    sale_id: sale.id,
    product_id: it.product_id ?? null,
    description: it.description,
    qty: it.qty ?? 1,
    unit_price: it.unit_price ?? 0,
    amount: (Number(it.qty || 0) * Number(it.unit_price || 0))
  }));

  const { error: iErr } = await supabaseAdmin.from("sale_items").insert(sItems);
  if (iErr) return res.status(500).json({ error: iErr.message });

  // Si es venta con productos, registra salida automática:
  // (en el siguiente paso, si lo quieres, lo hacemos “bien” con transacciones)

  res.json({ data: sale });
});

router.post("/goals", async (req, res) => {
  const { worker_id, month, year, goal_amount } = req.body || {};
  if (!worker_id || !month || !year) return res.status(400).json({ error: "worker_id, month, year required" });

  const { data, error } = await supabaseAdmin
    .from("sales_goals")
    .upsert({ worker_id, month, year, goal_amount: goal_amount ?? 0 }, { onConflict: "worker_id,month,year" })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

module.exports = router;
