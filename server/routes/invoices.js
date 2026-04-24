const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");
const { branchFilter } = require("../middleware/branchFilter");

router.get("/", async (req, res) => {
  try {
    const { status, q, client_id, quote_id, service_sheet_id } = req.query;

    let query = supabaseAdmin
      .from("invoices")
      .select(`
        *,
        client:clients(id, name, company, email, phone),
        quote:quotes(id, folio, title, status),
        service_sheet:service_sheets(id, client_name, route_name, city, location, service_type, status)
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (client_id && String(client_id).trim()) {
      query = query.eq("client_id", String(client_id).trim());
    }

    if (quote_id && String(quote_id).trim()) {
      query = query.eq("quote_id", String(quote_id).trim());
    }

    if (service_sheet_id && String(service_sheet_id).trim()) {
      query = query.eq("service_sheet_id", String(service_sheet_id).trim());
    }

    if (q && String(q).trim()) {
      const term = String(q).trim();
      query = query.or(
        `folio.ilike.%${term}%,client_name.ilike.%${term}%,service_location.ilike.%${term}%,billing_period.ilike.%${term}%`
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
      .from("invoices")
      .select(`
        *,
        client:clients(id, name, company, email, phone, address, rfc),
        quote:quotes(id, folio, title, status, valid_until),
        service_sheet:service_sheets(id, client_name, route_name, city, location, service_type, status, delivery_date, pickup_date)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "invoice not found" });

    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      folio,
      client_id,
      client_name,
      quote_id,
      service_sheet_id,
      delivery_date,
      billing_period,
      service_location,
      subtotal,
      tax,
      total,
      status,
      notes,
      created_by,
    } = req.body || {};

    if (!client_id && !client_name) {
      return res.status(400).json({ error: "client_id or client_name required" });
    }

    let resolvedClientName = client_name || null;
    let resolvedDeliveryDate = delivery_date || null;
    let resolvedServiceLocation = service_location || null;
    let resolvedSubtotal = Number(subtotal || 0);
    let resolvedTax = Number(tax || 0);
    let resolvedTotal = Number(total || 0);

    if (client_id) {
      const { data: clientRow, error: clientError } = await supabaseAdmin
        .from("clients")
        .select("id, name")
        .eq("id", client_id)
        .maybeSingle();

      if (clientError) {
        return res.status(500).json({ error: clientError.message });
      }

      if (!clientRow) {
        return res.status(400).json({ error: "client not found" });
      }

      resolvedClientName = clientRow.name;
    }

    if (service_sheet_id) {
      const { data: sheetRow, error: sheetError } = await supabaseAdmin
        .from("service_sheets")
        .select("id, client_id, client_name, delivery_date, location, total_price")
        .eq("id", service_sheet_id)
        .maybeSingle();

      if (sheetError) {
        return res.status(500).json({ error: sheetError.message });
      }

      if (!sheetRow) {
        return res.status(400).json({ error: "service sheet not found" });
      }

      if (!client_id && sheetRow.client_id) {
        const { data: clientRowFromSheet } = await supabaseAdmin
          .from("clients")
          .select("id, name")
          .eq("id", sheetRow.client_id)
          .maybeSingle();

        if (clientRowFromSheet) {
          resolvedClientName = clientRowFromSheet.name;
        } else if (sheetRow.client_name) {
          resolvedClientName = sheetRow.client_name;
        }
      }

      if (!resolvedDeliveryDate && sheetRow.delivery_date) {
        resolvedDeliveryDate = sheetRow.delivery_date;
      }

      if (!resolvedServiceLocation && sheetRow.location) {
        resolvedServiceLocation = sheetRow.location;
      }

      if (!resolvedTotal && Number(sheetRow.total_price || 0) > 0) {
        resolvedSubtotal = Number(sheetRow.total_price || 0);
        resolvedTotal = Number(sheetRow.total_price || 0);
      }
    }

    const payload = {
      folio: folio || null,
      client_id: client_id || null,
      client_name: resolvedClientName,
      quote_id: quote_id || null,
      service_sheet_id: service_sheet_id || null,
      delivery_date: resolvedDeliveryDate,
      billing_period: billing_period || null,
      service_location: resolvedServiceLocation,
      subtotal: resolvedSubtotal,
      tax: resolvedTax,
      total: resolvedTotal,
      status: status || "draft",
      notes: notes || "",
      created_by: created_by || null,
    };

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .insert(payload)
      .select(`
        *,
        client:clients(id, name, company, email, phone),
        quote:quotes(id, folio, title, status),
        service_sheet:service_sheets(id, client_name, route_name, city, location, service_type, status)
      `)
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
      folio,
      client_id,
      client_name,
      quote_id,
      service_sheet_id,
      delivery_date,
      billing_period,
      service_location,
      subtotal,
      tax,
      total,
      status,
      notes,
    } = req.body || {};

    let resolvedClientName = client_name || null;

    if (client_id) {
      const { data: clientRow, error: clientError } = await supabaseAdmin
        .from("clients")
        .select("id, name")
        .eq("id", client_id)
        .maybeSingle();

      if (clientError) {
        return res.status(500).json({ error: clientError.message });
      }

      if (!clientRow) {
        return res.status(400).json({ error: "client not found" });
      }

      resolvedClientName = clientRow.name;
    }

    const payload = {
      folio: folio || null,
      client_id: client_id || null,
      client_name: resolvedClientName,
      quote_id: quote_id || null,
      service_sheet_id: service_sheet_id || null,
      delivery_date: delivery_date || null,
      billing_period: billing_period || null,
      service_location: service_location || null,
      subtotal: Number(subtotal || 0),
      tax: Number(tax || 0),
      total: Number(total || 0),
      status: status || "draft",
      notes: notes || "",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update(payload)
      .eq("id", id)
      .select(`
        *,
        client:clients(id, name, company, email, phone),
        quote:quotes(id, folio, title, status),
        service_sheet:service_sheets(id, client_name, route_name, city, location, service_type, status)
      `)
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
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;