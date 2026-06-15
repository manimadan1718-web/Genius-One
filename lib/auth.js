import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  // Also check cookie
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/token=([^;]+)/)
  return match ? match[1] : null
}

export function requireAuth(handler, { adminOnly = false } = {}) {
  return async (req, res) => {
    const token = getTokenFromRequest(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const user = verifyToken(token)
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' })

    if (adminOnly && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    req.user = user
    return handler(req, res)
  }
}
