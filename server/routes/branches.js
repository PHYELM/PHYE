const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("*")
    .order("name");
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data: data || [] });
});

router.post("/", async (req, res) => {
  const { name, color } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const { data, error } = await supabaseAdmin
    .from("branches").insert({ name, color: color || "#1a3b6b" }).select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const { data, error } = await supabaseAdmin
    .from("branches").update({ name, color: color || null }).eq("id", id).select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from("branches").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

module.exports = router;