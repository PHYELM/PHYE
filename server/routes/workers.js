const router = require("express").Router();
const multer = require("multer");
const { supabaseAdmin } = require("../supabaseAdmin");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// obtener worker con nombres (dept/level/branch/permissions)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: worker, error: workerError } = await supabaseAdmin
      .from("workers")
      .select(`
        id,
        username,
        full_name,
        active,
        profile_photo_url,
        branch_id,
        department_id,
        level_id,
        department:departments!workers_department_id_fkey(id, name, color, icon),
        level:worker_levels!workers_level_id_fkey(id, name, authority, can_approve_quotes, can_manage_calendar),
        branch:branches!workers_branch_id_fkey(id, name, color)
      `)
      .eq("id", id)
      .maybeSingle();

    if (workerError) {
      return res.status(500).json({ error: workerError.message });
    }

    if (!worker) {
      return res.status(404).json({ error: "worker not found" });
    }

    const { data: levelPermissions, error: permissionsError } = await supabaseAdmin
      .from("level_module_permissions")
      .select("module_key, can_view, can_create, can_edit, can_approve, can_delete, can_export")
      .eq("level_id", worker.level_id);

    if (permissionsError) {
      return res.status(500).json({ error: permissionsError.message });
    }

    const permissionsMap = {};
    (levelPermissions || []).forEach((p) => {
      permissionsMap[p.module_key] = {
        can_view: Boolean(p.can_view),
        can_create: Boolean(p.can_create),
        can_edit: Boolean(p.can_edit),
        can_approve: Boolean(p.can_approve),
        can_delete: Boolean(p.can_delete),
        can_export: Boolean(p.can_export),
      };
    });

    return res.json({
      worker: {
        id: worker.id,
        username: worker.username,
        full_name: worker.full_name,
        active: worker.active,
        profile_photo_url: worker.profile_photo_url,
        branch_id: worker.branch_id || null,
        department_id: worker.department_id || null,
        level_id: worker.level_id || null,
        department_name: worker.department?.name || null,
        level_name: worker.level?.name || null,
        authority: worker.level?.authority || 1,
        can_approve_quotes: Boolean(worker.level?.can_approve_quotes),
        can_manage_calendar: Boolean(worker.level?.can_manage_calendar),
        branch_name: worker.branch?.name || null,
        branch_color: worker.branch?.color || null,
        permissions: permissionsMap,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
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