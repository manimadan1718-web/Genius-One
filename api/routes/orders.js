const router = require('express').Router();
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/orders ─────────────────────────────────────────────
// List all orders with basic property info — supports search & filter
router.get('/', requireAuth, async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('orders')
    .select(`
      *,
      property_info (address, owner, county_state),
      profiles!orders_created_by_fkey (full_name),
      assigned:profiles!orders_assigned_to_fkey (full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  if (search) {
    // Search order_no or address
    query = query.or(`order_no.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page: +page, limit: +limit });
});

// ── GET /api/orders/:id ─────────────────────────────────────────
// Full record with all child tables
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const [
    { data: order, error: oErr },
    { data: property },
    { data: taxEntries },
    { data: deeds },
    { data: mortgages },
    { data: satDocs },
    { data: liens },
    { data: rows },
    { data: probate },
    { data: misc }
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*, profiles!orders_created_by_fkey(full_name)').eq('id', id).single(),
    supabaseAdmin.from('property_info').select('*').eq('order_id', id).single(),
    supabaseAdmin.from('tax_entries').select('*').eq('order_id', id).order('sort_order'),
    supabaseAdmin.from('vesting_deeds').select('*').eq('order_id', id).order('sort_order'),
    supabaseAdmin.from('open_mortgages').select('*').eq('order_id', id).order('sort_order'),
    supabaseAdmin.from('satellite_docs').select('*').eq('order_id', id).order('sort_order'),
    supabaseAdmin.from('liens_judgements').select('*').eq('order_id', id).order('sort_order'),
    supabaseAdmin.from('rows_ccrs').select('*').eq('order_id', id).order('sort_order'),
    supabaseAdmin.from('divorce_probate').select('*').eq('order_id', id).order('sort_order'),
    supabaseAdmin.from('misc_docs').select('*').eq('order_id', id).order('sort_order')
  ]);

  if (oErr) return res.status(404).json({ error: 'Order not found' });

  res.json({
    order,
    property: property || {},
    tax_entries: taxEntries || [],
    vesting_deeds: deeds || [],
    open_mortgages: mortgages || [],
    satellite_docs: satDocs || [],
    liens_judgements: liens || [],
    rows_ccrs: rows || [],
    divorce_probate: probate || [],
    misc_docs: misc || []
  });
});

// ── POST /api/orders ────────────────────────────────────────────
// Create new order (returns order_id for subsequent save)
router.post('/', requireAuth, async (req, res) => {
  const { order_no, search_type } = req.body;
  if (!order_no) return res.status(400).json({ error: 'order_no is required' });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({ order_no, search_type: search_type || 'Full Search', created_by: req.user.id, status: 'in_progress' })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Order number already exists' });
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// ── PUT /api/orders/:id ─────────────────────────────────────────
// Full save — upserts all child tables in one request
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    order, property, tax_entries, vesting_deeds,
    open_mortgages, satellite_docs, liens_judgements,
    rows_ccrs, divorce_probate, misc_docs
  } = req.body;

  try {
    // 1. Update order status/search_type
    if (order) {
      await supabaseAdmin.from('orders').update({
        search_type: order.search_type,
        status: order.status,
        assigned_to: order.assigned_to || null
      }).eq('id', id);
    }

    // 2. Upsert property info
    if (property) {
      await supabaseAdmin.from('property_info').upsert({ ...property, order_id: id }, { onConflict: 'order_id' });
    }

    // 3. Replace child arrays (delete all then insert)
    const tables = [
      ['tax_entries', tax_entries],
      ['vesting_deeds', vesting_deeds],
      ['open_mortgages', open_mortgages],
      ['satellite_docs', satellite_docs],
      ['liens_judgements', liens_judgements],
      ['rows_ccrs', rows_ccrs],
      ['divorce_probate', divorce_probate],
      ['misc_docs', misc_docs]
    ];

    for (const [table, rows] of tables) {
      if (!Array.isArray(rows)) continue;
      await supabaseAdmin.from(table).delete().eq('order_id', id);
      if (rows.length > 0) {
        const cleaned = rows.map((r, i) => {
          const { id: _id, ...rest } = r;
          return { ...rest, order_id: id, sort_order: i };
        });
        await supabaseAdmin.from(table).insert(cleaned);
      }
    }

    // 4. Update order updated_at
    await supabaseAdmin.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', id);

    res.json({ success: true, message: 'Record saved successfully' });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

// ── PATCH /api/orders/:id/status ────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const valid = ['pending','in_progress','completed','reviewed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { data, error } = await supabaseAdmin
    .from('orders').update({ status }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /api/orders/:id ──────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin.from('orders').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
