import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { is_active } = req.body
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select('id, email, name, role, is_active')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ user: data })
  }

  return res.status(405).end()
}

export default requireAuth(handler, { adminOnly: true })
