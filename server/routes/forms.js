const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

// Forms
router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("forms").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/", async (req, res) => {
  const { title, description, fields, created_by } = req.body || {};
  if (!title || !fields) return res.status(400).json({ error: "title and fields required" });

  const { data, error } = await supabaseAdmin
    .from("forms")
    .insert({ title, description, fields, created_by })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// Answers
router.get("/:id/answers", async (req, res) => {
  const formId = req.params.id;
  const { data, error } = await supabaseAdmin
    .from("form_answers")
    .select("*")
    .eq("form_id", formId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

router.post("/:id/answers", async (req, res) => {
  const formId = req.params.id;
  const { worker_id, answers } = req.body || {};
  if (!answers) return res.status(400).json({ error: "answers required" });

  const { data, error } = await supabaseAdmin
    .from("form_answers")
    .insert({ form_id: formId, worker_id, answers, last_edited: new Date().toISOString() })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

module.exports = router;
