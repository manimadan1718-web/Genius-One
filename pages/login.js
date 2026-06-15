import { useState } from 'react'
import { useRouter } from 'next/router'
import { AuthProvider, useAuth } from '../lib/AuthContext'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="lc">G</div>
          <h1>GeniusOne</h1>
          <p>Typing Portal — Sign in to continue</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '12px 14px', background: '#f8f8f6', borderRadius: 6, fontSize: 12, color: '#6b6860' }}>
          <strong style={{ color: '#2c2b28' }}>Default admin login:</strong><br />
          admin@geniusonesolutions.com / Admin@123<br />
          <span style={{ color: '#D42B2B' }}>Change this password immediately after first login.</span>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return <AuthProvider><LoginPage /></AuthProvider>
}
