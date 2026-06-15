const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Verify user still active in DB
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('id', payload.userId)
      .single();
    if (error || !user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
