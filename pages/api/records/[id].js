import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('property_records')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Record not found' })
    return res.status(200).json({ record: data })
  }

  if (req.method === 'PUT') {
    const { id: _id, created_at, created_by, ...updates } = req.body

    const { data, error } = await supabaseAdmin
      .from('property_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ record: data })
  }

  if (req.method === 'DELETE') {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

    const { error } = await supabaseAdmin
      .from('property_records')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}

export default requireAuth(handler)
