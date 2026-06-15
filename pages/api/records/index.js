import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

async function handler(req, res) {
  if (req.method === 'GET') {
    const { search, status, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('property_records')
      .select('id, order_no, search_type, address, owner, buyer_borrower, status, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status) query = query.eq('status', status)
    if (search) {
      query = query.or(`order_no.ilike.%${search}%,address.ilike.%${search}%,owner.ilike.%${search}%,buyer_borrower.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ records: data, total: count, page: parseInt(page), limit: parseInt(limit) })
  }

  if (req.method === 'POST') {
    const body = req.body

    // Validate required fields
    if (!body.order_no) return res.status(400).json({ error: 'order_no is required' })

    const { data, error } = await supabaseAdmin
      .from('property_records')
      .insert({ ...body, created_by: req.user.id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Order number already exists' })
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ record: data })
  }

  return res.status(405).end()
}

export default requireAuth(handler)
