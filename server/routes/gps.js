const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

router.get("/units", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("units").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/units", async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const { data, error } = await supabaseAdmin.from("units").insert({ name }).select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// Ingest punto GPS
router.post("/points", async (req, res) => {
  const { unit_id, lat, lng, speed, heading, captured_at } = req.body || {};
  if (!unit_id || lat == null || lng == null) return res.status(400).json({ error: "unit_id, lat, lng required" });

  const { data, error } = await supabaseAdmin
    .from("gps_points")
    .insert({ unit_id, lat, lng, speed, heading, captured_at: captured_at ?? new Date().toISOString() })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

module.exports = router;
