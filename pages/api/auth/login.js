import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../../lib/supabase'
import { signToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role })

  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
  return res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}
