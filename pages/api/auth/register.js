import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, name, role = 'typist' } = req.body
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' })

  const hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ email: email.toLowerCase().trim(), password_hash: hash, name, role })
    .select('id, email, name, role')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.status(201).json({ user: data })
}

export default requireAuth(handler, { adminOnly: true })
