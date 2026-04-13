const { supabaseAdmin } = require("../supabaseAdmin");

// Cache ligero
const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutos

function buildDefaultPermissionMap() {
  return {
    home:          { can_view: true,  can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    admin:         { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    forms:         { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    inventory:     { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    quotes:        { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    operations:    { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    invoices:      { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    serviceSheets: { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    weeklyReports: { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    calendar:      { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    services:      { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    sales:         { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
    gps:           { can_view: false, can_create: false, can_edit: false, can_approve: false, can_delete: false, can_export: false },
  };
}

function normalizeModuleKey(moduleKey = "") {
  const raw = String(moduleKey || "").trim();
  const map = {
    service_sheets: "serviceSheets",
    weekly_reports: "weeklyReports",
  };
  return map[raw] || raw;
}

function buildFullAccessPermissionMap() {
  const base = buildDefaultPermissionMap();
  Object.keys(base).forEach((k) => {
    base[k] = {
      can_view: true,
      can_create: true,
      can_edit: true,
      can_approve: true,
      can_delete: true,
      can_export: true,
    };
  });
  return base;
}

async function getLevelPermissions(levelId) {
  const base = buildDefaultPermissionMap();
  if (!levelId) return base;

  const { data, error } = await supabaseAdmin
    .from("level_module_permissions")
    .select("module_key, can_view, can_create, can_edit, can_approve, can_delete, can_export")
    .eq("level_id", levelId);

  if (error) throw new Error(error.message);

  (data || []).forEach((row) => {
    const key = normalizeModuleKey(row.module_key);
    if (!base[key]) return;

    base[key] = {
      can_view: Boolean(row.can_view),
      can_create: Boolean(row.can_create),
      can_edit: Boolean(row.can_edit),
      can_approve: Boolean(row.can_approve),
      can_delete: Boolean(row.can_delete),
      can_export: Boolean(row.can_export),
    };
  });

  return base;
}

async function branchFilter(req, res, next) {
  const workerId = String(req.headers["x-worker-id"] || "").trim();

  if (!workerId) {
    req.branchId = null;
    req.isDirector = false;
    req.actorWorker = null;
    req.actorPermissions = buildDefaultPermissionMap();
    return next();
  }

  try {
    const hit = cache.get(workerId);
    if (hit && Date.now() - hit.ts < TTL) {
      req.branchId = hit.branchId;
      req.isDirector = hit.isDirector;
      req.actorWorker = hit.actorWorker;
      req.actorPermissions = hit.actorPermissions;
      return next();
    }

    const { data, error } = await supabaseAdmin
      .from("workers")
      .select(`
        id,
        username,
        full_name,
        profile_photo_url,
        branch_id,
        level_id,
        department_id,
        branch:branches!workers_branch_id_fkey(id, name, color),
        department:departments!workers_department_id_fkey(name),
        level:worker_levels!workers_level_id_fkey(id, name, authority)
      `)
      .eq("id", workerId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const deptName = String(data?.department?.name || "").toUpperCase();
    const authority = Number(data?.level?.authority || 0);
    const isDirector = deptName.includes("DIRECC") || authority >= 5;

    const actorPermissions = isDirector
      ? buildFullAccessPermissionMap()
      : await getLevelPermissions(data?.level_id || null);

    const result = {
      branchId: isDirector ? null : (data?.branch_id || null),
      isDirector,
      actorWorker: data
        ? {
            id: data.id,
            username: data.username || "",
            name: data.full_name || data.username || "",
            photo: data.profile_photo_url || "",
            branch_id: data.branch_id || null,
            branch_name: data.branch?.name || "",
            branch_color: data.branch?.color || "",
            level_id: data.level_id || null,
            department_id: data.department_id || null,
          }
        : null,
      actorPermissions,
      ts: Date.now(),
    };

    cache.set(workerId, result);

    req.branchId = result.branchId;
    req.isDirector = result.isDirector;
    req.actorWorker = result.actorWorker;
    req.actorPermissions = result.actorPermissions;

    return next();
  } catch (e) {
    req.branchId = null;
    req.isDirector = false;
    req.actorWorker = null;
    req.actorPermissions = buildDefaultPermissionMap();
    return next();
  }
}

function invalidateBranchCache(workerId) {
  cache.delete(workerId);
}

function hasModulePermission(req, moduleKey, actionKey = "can_view") {
  if (req.isDirector) return true;

  const key = normalizeModuleKey(moduleKey);
  const perms = req.actorPermissions?.[key];
  if (!perms) return false;

  if (actionKey === "access") {
    return Boolean(
      perms.can_view ||
      perms.can_create ||
      perms.can_edit ||
      perms.can_approve ||
      perms.can_delete ||
      perms.can_export
    );
  }

  return Boolean(perms[actionKey]);
}

module.exports = {
  branchFilter,
  invalidateBranchCache,
  hasModulePermission,
};