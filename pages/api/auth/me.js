import { requireAuth } from '../../../lib/auth'

function handler(req, res) {
  return res.status(200).json({ user: req.user })
}

export default requireAuth(handler)
