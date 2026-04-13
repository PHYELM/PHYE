const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function safeText(value) {
  return String(value || "").trim();
}

function normalizeCollectionEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((item) => ({
      client_name: safeText(item?.client_name),
      amount: toNumber(item?.amount),
      observations: safeText(item?.observations),
    }))
    .filter((item) => item.client_name || item.amount || item.observations);
}

function normalizeWeeklyGoals(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((item) => ({
      concept: safeText(item?.concept),
      objective: toNumber(item?.objective),
      real: toNumber(item?.real),
      amount: toNumber(item?.amount),
      next_week_goal: toNumber(item?.next_week_goal),
      observations: safeText(item?.observations),
    }))
    .filter(
      (item) =>
        item.concept ||
        item.objective ||
        item.real ||
        item.amount ||
        item.next_week_goal ||
        item.observations
    );
}

function normalizeProspectingEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((item) => ({
      prospect_name: safeText(item?.prospect_name),
      follow_up_date: item?.follow_up_date || null,
      observations: safeText(item?.observations),
    }))
    .filter((item) => item.prospect_name || item.follow_up_date || item.observations);
}

function normalizePortfolioIssues(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((item) => ({
      client_name: safeText(item?.client_name),
      amount: toNumber(item?.amount),
      observations: safeText(item?.observations),
    }))
    .filter((item) => item.client_name || item.amount || item.observations);
}

function normalizeVehicleEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((item) => ({
      unit_name: safeText(item?.unit_name),
      km_initial: toNumber(item?.km_initial),
      km_final: toNumber(item?.km_final),
      km_total: toNumber(item?.km_total),
      fuel_amount: toNumber(item?.fuel_amount),
      performance: toNumber(item?.performance),
      maintenance_amount: toNumber(item?.maintenance_amount),
      observations: safeText(item?.observations),
    }))
    .filter(
      (item) =>
        item.unit_name ||
        item.km_initial ||
        item.km_final ||
        item.km_total ||
        item.fuel_amount ||
        item.performance ||
        item.maintenance_amount ||
        item.observations
    );
}

function normalizeExtraExpenses(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((item) => ({
      concept: safeText(item?.concept),
      amount: toNumber(item?.amount),
      observations: safeText(item?.observations),
    }))
    .filter((item) => item.concept || item.amount || item.observations);
}

function normalizeUnitReports(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((item) => ({
      unit_name: safeText(item?.unit_name),
      observations: safeText(item?.observations),
    }))
    .filter((item) => item.unit_name || item.observations);
}

function normalizeInventorySnapshot(snapshot) {
  return {
    obra_service: toNumber(snapshot?.obra_service),
    evento_service: toNumber(snapshot?.evento_service),
    obra_patios: toNumber(snapshot?.obra_patios),
    evento_patios: toNumber(snapshot?.evento_patios),
    total_units: toNumber(snapshot?.total_units),
    observations: safeText(snapshot?.observations),
  };
}

function totalCollectedFromEntries(entries) {
  return normalizeCollectionEntries(entries).reduce(
    (acc, item) => acc + toNumber(item.amount),
    0
  );
}

function totalSalesFromReport(payload) {
  return (
    toNumber(payload?.sales_2026) +
    toNumber(payload?.weekly_billing) +
    toNumber(payload?.sales_without_invoice)
  );
}

router.get("/", async (req, res) => {
  try {
    const { q, week_label, worker_id, branch_name, month_label } = req.query;

    let query = supabaseAdmin
      .from("weekly_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (week_label && safeText(week_label)) {
      query = query.eq("week_label", safeText(week_label));
    }

    if (worker_id && safeText(worker_id)) {
      query = query.eq("created_by", safeText(worker_id));
    }

    if (branch_name && safeText(branch_name)) {
      query = query.eq("branch_name", safeText(branch_name));
    }

    if (month_label && safeText(month_label)) {
      query = query.eq("month_label", safeText(month_label));
    }

    if (q && safeText(q)) {
      const term = safeText(q);
      query = query.or(
        `week_label.ilike.%${term}%,branch_name.ilike.%${term}%,month_label.ilike.%${term}%,summary.ilike.%${term}%,notes.ilike.%${term}%,report_observations.ilike.%${term}%,team_observations.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("weekly_reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "weekly report not found" });

    return res.json({
      data: {
        ...data,
        collection_entries: Array.isArray(data.collection_entries) ? data.collection_entries : [],
        weekly_goals: Array.isArray(data.weekly_goals) ? data.weekly_goals : [],
        prospecting_entries: Array.isArray(data.prospecting_entries) ? data.prospecting_entries : [],
        portfolio_issues: Array.isArray(data.portfolio_issues) ? data.portfolio_issues : [],
        inventory_snapshot:
          data.inventory_snapshot && typeof data.inventory_snapshot === "object"
            ? data.inventory_snapshot
            : {},
        vehicle_entries: Array.isArray(data.vehicle_entries) ? data.vehicle_entries : [],
        extra_expenses: Array.isArray(data.extra_expenses) ? data.extra_expenses : [],
        unit_reports: Array.isArray(data.unit_reports) ? data.unit_reports : [],
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      week_label,
      branch_name,
      month_label,
      start_date,
      end_date,
      sales_2025,
      budget_2026,
      sales_2026,
      weekly_billing,
      sales_without_invoice,
      total_sales,
      total_collected,
      collection_entries,
      weekly_goals,
      prospecting_entries,
      portfolio_issues,
      inventory_snapshot,
      vehicle_entries,
      extra_expenses,
      unit_reports,
      summary,
      notes,
      report_observations,
      team_observations,
      created_by,
    } = req.body || {};

    if (!safeText(week_label)) {
      return res.status(400).json({ error: "week_label required" });
    }

    const safeCollectionEntries = normalizeCollectionEntries(collection_entries);
    const safeWeeklyGoals = normalizeWeeklyGoals(weekly_goals);
    const safeProspectingEntries = normalizeProspectingEntries(prospecting_entries);
    const safePortfolioIssues = normalizePortfolioIssues(portfolio_issues);
    const safeInventorySnapshot = normalizeInventorySnapshot(inventory_snapshot);
    const safeVehicleEntries = normalizeVehicleEntries(vehicle_entries);
    const safeExtraExpenses = normalizeExtraExpenses(extra_expenses);
    const safeUnitReports = normalizeUnitReports(unit_reports);

    const safeTotalCollected =
      total_collected !== undefined && total_collected !== null && total_collected !== ""
        ? toNumber(total_collected)
        : totalCollectedFromEntries(safeCollectionEntries);

    const safeTotalSales =
      total_sales !== undefined && total_sales !== null && total_sales !== ""
        ? toNumber(total_sales)
        : totalSalesFromReport({
            sales_2026,
            weekly_billing,
            sales_without_invoice,
          });

    const payload = {
      week_label: safeText(week_label),
      branch_name: safeText(branch_name) || null,
      month_label: safeText(month_label) || null,
      start_date: start_date || null,
      end_date: end_date || null,
      sales_2025: toNumber(sales_2025),
      budget_2026: toNumber(budget_2026),
      sales_2026: toNumber(sales_2026),
      weekly_billing: toNumber(weekly_billing),
      sales_without_invoice: toNumber(sales_without_invoice),
      total_sales: safeTotalSales,
      total_collected: safeTotalCollected,
      collection_entries: safeCollectionEntries,
      weekly_goals: safeWeeklyGoals,
      prospecting_entries: safeProspectingEntries,
      portfolio_issues: safePortfolioIssues,
      inventory_snapshot: safeInventorySnapshot,
      vehicle_entries: safeVehicleEntries,
      extra_expenses: safeExtraExpenses,
      unit_reports: safeUnitReports,
      summary: safeText(summary),
      notes: safeText(notes),
      report_observations: safeText(report_observations),
      team_observations: safeText(team_observations),
      created_by: created_by || null,
    };

    const { data, error } = await supabaseAdmin
      .from("weekly_reports")
      .insert(payload)
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      week_label,
      branch_name,
      month_label,
      start_date,
      end_date,
      sales_2025,
      budget_2026,
      sales_2026,
      weekly_billing,
      sales_without_invoice,
      total_sales,
      total_collected,
      collection_entries,
      weekly_goals,
      prospecting_entries,
      portfolio_issues,
      inventory_snapshot,
      vehicle_entries,
      extra_expenses,
      unit_reports,
      summary,
      notes,
      report_observations,
      team_observations,
    } = req.body || {};

    const safeCollectionEntries = normalizeCollectionEntries(collection_entries);
    const safeWeeklyGoals = normalizeWeeklyGoals(weekly_goals);
    const safeProspectingEntries = normalizeProspectingEntries(prospecting_entries);
    const safePortfolioIssues = normalizePortfolioIssues(portfolio_issues);
    const safeInventorySnapshot = normalizeInventorySnapshot(inventory_snapshot);
    const safeVehicleEntries = normalizeVehicleEntries(vehicle_entries);
    const safeExtraExpenses = normalizeExtraExpenses(extra_expenses);
    const safeUnitReports = normalizeUnitReports(unit_reports);

    const safeTotalCollected =
      total_collected !== undefined && total_collected !== null && total_collected !== ""
        ? toNumber(total_collected)
        : totalCollectedFromEntries(safeCollectionEntries);

    const safeTotalSales =
      total_sales !== undefined && total_sales !== null && total_sales !== ""
        ? toNumber(total_sales)
        : totalSalesFromReport({
            sales_2026,
            weekly_billing,
            sales_without_invoice,
          });

    const payload = {
      week_label: safeText(week_label) || null,
      branch_name: safeText(branch_name) || null,
      month_label: safeText(month_label) || null,
      start_date: start_date || null,
      end_date: end_date || null,
      sales_2025: toNumber(sales_2025),
      budget_2026: toNumber(budget_2026),
      sales_2026: toNumber(sales_2026),
      weekly_billing: toNumber(weekly_billing),
      sales_without_invoice: toNumber(sales_without_invoice),
      total_sales: safeTotalSales,
      total_collected: safeTotalCollected,
      collection_entries: safeCollectionEntries,
      weekly_goals: safeWeeklyGoals,
      prospecting_entries: safeProspectingEntries,
      portfolio_issues: safePortfolioIssues,
      inventory_snapshot: safeInventorySnapshot,
      vehicle_entries: safeVehicleEntries,
      extra_expenses: safeExtraExpenses,
      unit_reports: safeUnitReports,
      summary: safeText(summary),
      notes: safeText(notes),
      report_observations: safeText(report_observations),
      team_observations: safeText(team_observations),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("weekly_reports")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("weekly_reports")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;