const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("quotes").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/", async (req, res) => {
  const { customer_id, notes, created_by, items = [], tax = 0 } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items required" });

  const subtotal = items.reduce((a, it) => a + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0);
  const total = subtotal + Number(tax || 0);

  const { data: quote, error: qErr } = await supabaseAdmin
    .from("quotes")
    .insert({ customer_id, notes, created_by, subtotal, tax, total })
    .select("*")
    .single();

  if (qErr) return res.status(500).json({ error: qErr.message });

  const qItems = items.map(it => ({
    quote_id: quote.id,
    description: it.description,
    qty: it.qty ?? 1,
    unit_price: it.unit_price ?? 0,
    amount: (Number(it.qty || 0) * Number(it.unit_price || 0))
  }));

  const { error: iErr } = await supabaseAdmin.from("quote_items").insert(qItems);
  if (iErr) return res.status(500).json({ error: iErr.message });

  res.json({ data: quote });
});

module.exports = router;
