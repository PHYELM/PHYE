const { supabaseAdmin } = require("../supabaseAdmin");

// Cache ligero para no golpear la BD en cada request
const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutos

async function branchFilter(req, res, next) {
  const workerId = req.headers["x-worker-id"];

  if (!workerId) {
    req.branchId    = null;
    req.isDirector  = false;
    req.actorWorker = null;
    return next();
  }

  try {
    const hit = cache.get(workerId);
    if (hit && Date.now() - hit.ts < TTL) {
      req.branchId    = hit.branchId;
      req.isDirector  = hit.isDirector;
      req.actorWorker = hit.actorWorker;
      return next();
    }

    const { data } = await supabaseAdmin
      .from("workers")
      .select("id, full_name, profile_photo_url, branch_id, level:worker_levels(authority), department:departments(name)")
      .eq("id", workerId)
      .maybeSingle();

    const deptName = String(data?.department?.name || "").toUpperCase();
    const authority = Number(data?.level?.authority || 0);

    // Dirección ve todo; autoridad 5 también
    const isDirector = deptName.includes("DIRECC") || authority >= 5;

    const result = {
      branchId:    isDirector ? null : (data?.branch_id || null),
      isDirector,
      actorWorker: data
        ? { id: data.id, name: data.full_name, photo: data.profile_photo_url, branch_id: data.branch_id }
        : null,
      ts: Date.now(),
    };

    cache.set(workerId, result);
    req.branchId    = result.branchId;
    req.isDirector  = result.isDirector;
    req.actorWorker = result.actorWorker;
    next();
  } catch (e) {
    req.branchId    = null;
    req.isDirector  = false;
    req.actorWorker = null;
    next();
  }
}

// Llamar esto cuando se edita un worker (admin.js)
function invalidateBranchCache(workerId) {
  cache.delete(workerId);
}

module.exports = { branchFilter, invalidateBranchCache };