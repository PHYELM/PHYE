const router = require("express").Router();
const multer = require("multer");
const { supabaseAdmin } = require("../supabaseAdmin");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// obtener worker con nombres (dept/level/branch/permissions)
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("workers")
    .select(`
      id, username, full_name, active, profile_photo_url,
      branch_id,
      department:departments!workers_department_id_fkey(name),
      level:worker_levels!workers_level_id_fkey(name, authority, can_approve_quotes),
      branch:branches!workers_branch_id_fkey(id, name, color),
      permissions:user_module_permissions(module_key, can_view, can_create, can_edit, can_approve, can_delete, can_export)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "worker not found" });

  // Construye mapa de permisos por módulo
  const permissionsMap = {};
  (data.permissions || []).forEach((p) => {
    permissionsMap[p.module_key] = {
      can_view: p.can_view,
      can_create: p.can_create,
      can_edit: p.can_edit,
      can_approve: p.can_approve,
      can_delete: p.can_delete,
      can_export: p.can_export,
    };
  });

  return res.json({
    worker: {
      id: data.id,
      username: data.username,
      full_name: data.full_name,
      active: data.active,
      profile_photo_url: data.profile_photo_url,
      branch_id: data.branch_id || null,
      department_name: data.department?.name || null,
      level_name: data.level?.name || null,
      authority: data.level?.authority || 1,
      can_approve_quotes: Boolean(data.level?.can_approve_quotes),
      branch_name: data.branch?.name || null,
      branch_color: data.branch?.color || null,
      permissions: permissionsMap,
    }
  });
});
// subir foto de perfil
router.post("/:id/photo", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "photo required" });

    // validar mime
    const ok = ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);
    if (!ok) return res.status(400).json({ error: "Only png, jpeg, webp allowed" });

    const ext =
      file.mimetype === "image/png" ? "png" :
      file.mimetype === "image/webp" ? "webp" : "jpg";

    // bucket (créalo en Supabase Storage)
    const bucket = "worker-avatars";

    // path: workers/<id>/avatar.<ext>
    const filePath = `workers/${id}/avatar.${ext}`;

    // upsert => reemplaza si ya existe
    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (upErr) return res.status(500).json({ error: upErr.message });

    // url pública
    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = pub?.publicUrl;

    if (!publicUrl) return res.status(500).json({ error: "Could not generate public url" });

    // guardar en workers.profile_photo_url
    const { error: updErr } = await supabaseAdmin
      .from("workers")
      .update({ profile_photo_url: publicUrl })
      .eq("id", id);

    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.json({ profile_photo_url: publicUrl });
  } catch (e) {
    console.error("UPLOAD PHOTO ERROR:", e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;