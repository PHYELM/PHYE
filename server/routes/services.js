const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

router.get("/types", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("service_types").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/types", async (req, res) => {
  const { name, base_price } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const { data, error } = await supabaseAdmin.from("service_types").insert({ name, base_price: base_price ?? 0 }).select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("services").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/", async (req, res) => {
  const { customer_id, service_type_id, scheduled_at, assigned_to, notes } = req.body || {};
  const { data, error } = await supabaseAdmin
    .from("services")
    .insert({ customer_id, service_type_id, scheduled_at, assigned_to, notes })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

module.exports = router;
