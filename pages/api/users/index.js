import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ users: data })
  }

  return res.status(405).end()
}

export default requireAuth(handler, { adminOnly: true })
