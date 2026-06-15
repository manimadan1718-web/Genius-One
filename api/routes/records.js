const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All records routes require auth
router.use(requireAuth);

// Child table names mapped to their record_id FK
const CHILD_TABLES = [
  'tax_entries',
  'vesting_deeds',
  'open_mortgages',
  'satellite_documents',
  'liens_judgements',
  'rows_ccrs_easements',
  'divorce_probate',
  'misc_docs',
];

// ── GET /api/records/stats/summary ──────────────────────────
router.get('/stats/summary', async (req, res) => {
  try {
    // Total count
    const { count: total } = await supabase
      .from('property_records')
      .select('*', { count: 'exact', head: true });

    // Today count
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('property_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today + 'T00:00:00Z');

    // By status
    const { data: statusData } = await supabase
      .from('property_records')
      .select('status');

    const byStatus = { draft: 0, in_progress: 0, completed: 0, reviewed: 0 };
    (statusData || []).forEach(r => { if (byStatus[r.status] !== undefined) byStatus[r.status]++; });

    res.json({ total: total || 0, today: todayCount || 0, byStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/records ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const { page = 1, limit = 25, search = '', status = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = supabase
      .from('property_records')
      .select('id, order_no, address, owner, status, search_type, county_state, created_at, updated_at', { count: 'exact' });

    if (search) {
      query = query.or(`order_no.ilike.%${search}%,address.ilike.%${search}%,owner.ilike.%${search}%,apn.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);

    // Typists can only see their own records
    if (req.user.role !== 'admin') {
      query = query.eq('created_by', req.user.id);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ records: data, total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/records/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: record, error } = await supabase
      .from('property_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !record) return res.status(404).json({ error: 'Record not found' });

    // Check ownership for typists
    if (req.user.role !== 'admin' && record.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Load all child tables
    const childData = {};
    for (const table of CHILD_TABLES) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('record_id', id)
        .order('sort_order', { ascending: true });
      childData[table] = data || [];
    }

    res.json({ record: { ...record, ...childData } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/records ────────────────────────────────────────
router.post('/', async (req, res) => {
  const { children, ...main } = req.body;
  if (!main.order_no) return res.status(400).json({ error: 'order_no is required' });

  try {
    const { data: record, error } = await supabase
      .from('property_records')
      .insert({ ...main, created_by: req.user.id, updated_by: req.user.id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Order # already exists' });
      return res.status(500).json({ error: error.message });
    }

    await saveChildren(record.id, children);
    res.status(201).json({ record });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/records/:id ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { children, ...main } = req.body;

  try {
    // Ownership check
    const { data: existing } = await supabase.from('property_records').select('created_by').eq('id', id).single();
    if (!existing) return res.status(404).json({ error: 'Record not found' });
    if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: record, error } = await supabase
      .from('property_records')
      .update({ ...main, updated_by: req.user.id })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await saveChildren(id, children);
    res.json({ record });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/records/:id/status ───────────────────────────
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['draft', 'in_progress', 'completed', 'reviewed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { data, error } = await supabase
    .from('property_records')
    .update({ status, updated_by: req.user.id })
    .eq('id', id)
    .select('id, order_no, status')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ record: data });
});

// ── DELETE /api/records/:id  (admin only) ───────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  // Child rows cascade via FK ON DELETE CASCADE in schema
  const { error } = await supabase.from('property_records').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Record deleted' });
});

// ── HELPERS ──────────────────────────────────────────────────
async function saveChildren(recordId, children = {}) {
  for (const table of CHILD_TABLES) {
    const rows = children[table];
    if (!Array.isArray(rows)) continue;

    // Delete existing and re-insert (simplest for full replace)
    await supabase.from(table).delete().eq('record_id', recordId);

    const inserts = rows
      .map((row, i) => ({ ...row, record_id: recordId, sort_order: i }))
      .filter(row => hasContent(row, table));

    if (inserts.length > 0) {
      await supabase.from(table).insert(inserts);
    }
  }
}

function hasContent(row, table) {
  // Skip fully empty rows
  const ignore = new Set(['record_id', 'sort_order', 'id', 'created_at']);
  return Object.entries(row).some(([k, v]) => !ignore.has(k) && v !== null && v !== '' && v !== undefined);
}

module.exports = router;
