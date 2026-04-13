const router = require("express").Router();
const { supabaseAdmin } = require("../supabaseAdmin");

router.get("/", async (req, res) => {
  try {
    const { q, route, city, status, client_id, quote_id } = req.query;

    let query = supabaseAdmin
      .from("service_sheets")
      .select(`
        *,
        client:clients(id, name, company, email, phone),
        quote:quotes(id, folio, title, status)
      `)
      .order("created_at", { ascending: false });

    if (route && String(route).trim()) {
      query = query.eq("route_name", String(route).trim());
    }

    if (city && String(city).trim()) {
      query = query.eq("city", String(city).trim());
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (client_id && String(client_id).trim()) {
      query = query.eq("client_id", String(client_id).trim());
    }

    if (quote_id && String(quote_id).trim()) {
      query = query.eq("quote_id", String(quote_id).trim());
    }

    if (q && String(q).trim()) {
      const term = String(q).trim();
      query = query.or(
        `client_name.ilike.%${term}%,location.ilike.%${term}%,route_name.ilike.%${term}%,city.ilike.%${term}%,service_type.ilike.%${term}%`
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
      .from("service_sheets")
      .select(`
        *,
        client:clients(id, name, company, email, phone, address, rfc),
        quote:quotes(id, folio, title, status)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "service sheet not found" });

    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      client_id,
      client_name,
      quote_id,
      route_name,
      city,
      location,
      location_lat,
      location_lng,
      quantity,
      unit_price,
      total_price,
      delivery_date,
      pickup_date,
      service_type,
      status,
      notes,
      created_by,
    } = req.body || {};

    if (!client_id && !client_name) {
      return res.status(400).json({ error: "client_id or client_name required" });
    }

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

    const safeQuantity = Number(quantity || 0);
    const safeUnitPrice = Number(unit_price || 0);
    const computedTotal = safeQuantity * safeUnitPrice;
    const safeTotalPrice =
      total_price !== undefined && total_price !== null && total_price !== ""
        ? Number(total_price || 0)
        : computedTotal;

    const payload = {
      client_id: client_id || null,
      client_name: resolvedClientName,
      quote_id: quote_id || null,
      route_name: route_name || null,
      city: city || null,
      location: location || null,
      location_lat:
        location_lat !== undefined && location_lat !== null && location_lat !== ""
          ? Number(location_lat)
          : null,
      location_lng:
        location_lng !== undefined && location_lng !== null && location_lng !== ""
          ? Number(location_lng)
          : null,
      quantity: safeQuantity,
      unit_price: safeUnitPrice,
      total_price: safeTotalPrice,
      delivery_date: delivery_date || null,
      pickup_date: pickup_date || null,
      service_type: service_type || null,
      status: status || "pending",
      notes: notes || "",
      created_by: created_by || null,
    };

    const { data, error } = await supabaseAdmin
      .from("service_sheets")
      .insert(payload)
      .select(`
        *,
        client:clients(id, name, company, email, phone),
        quote:quotes(id, folio, title, status)
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
      client_id,
      client_name,
      quote_id,
      route_name,
      city,
      location,
      location_lat,
      location_lng,
      quantity,
      unit_price,
      total_price,
      delivery_date,
      pickup_date,
      service_type,
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

    const safeQuantity = Number(quantity || 0);
    const safeUnitPrice = Number(unit_price || 0);
    const computedTotal = safeQuantity * safeUnitPrice;
    const safeTotalPrice =
      total_price !== undefined && total_price !== null && total_price !== ""
        ? Number(total_price || 0)
        : computedTotal;

    const payload = {
      client_id: client_id || null,
      client_name: resolvedClientName,
      quote_id: quote_id || null,
      route_name: route_name || null,
      city: city || null,
      location: location || null,
      location_lat:
        location_lat !== undefined && location_lat !== null && location_lat !== ""
          ? Number(location_lat)
          : null,
      location_lng:
        location_lng !== undefined && location_lng !== null && location_lng !== ""
          ? Number(location_lng)
          : null,
      quantity: safeQuantity,
      unit_price: safeUnitPrice,
      total_price: safeTotalPrice,
      delivery_date: delivery_date || null,
      pickup_date: pickup_date || null,
      service_type: service_type || null,
      status: status || "pending",
      notes: notes || "",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("service_sheets")
      .update(payload)
      .eq("id", id)
      .select(`
        *,
        client:clients(id, name, company, email, phone),
        quote:quotes(id, folio, title, status)
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
      .from("service_sheets")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;