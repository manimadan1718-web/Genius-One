import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthProvider } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, draft: 0, completed: 0, reviewed: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/records?limit=5')
      .then(r => r.json())
      .then(data => {
        setRecent(data.records || [])
        const s = { total: data.total || 0, draft: 0, completed: 0, reviewed: 0 }
        data.records?.forEach(r => { if (s[r.status] !== undefined) s[r.status]++ })
        setStats(s)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout
      title="Dashboard"
      subtitle={`Welcome back, ${user?.name}`}
      actions={
        <Link href="/records/new">
          <button className="btn btn-primary btn-sm">+ New Record</button>
        </Link>
      }
    >
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Draft</div>
          <div className="stat-value" style={{ color: '#6b6860' }}>{stats.draft}</div>
          <div className="stat-sub">In progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{stats.completed}</div>
          <div className="stat-sub">Ready for review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reviewed</div>
          <div className="stat-value" style={{ color: '#ca8a04' }}>{stats.reviewed}</div>
          <div className="stat-sub">Finalized</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-dot"></div>
          <h2>Recent Records</h2>
        </div>
        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#6b6860', fontSize: 13 }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>No records yet. <Link href="/records/new" style={{ color: '#1B2B4B', fontWeight: 500 }}>Create your first one →</Link></p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Address</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500, color: '#1B2B4B' }}>{r.order_no}</td>
                      <td style={{ color: '#6b6860', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address || '—'}</td>
                      <td>{r.owner || '—'}</td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                      <td style={{ color: '#6b6860', fontSize: 12 }}>{new Date(r.updated_at).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/records/${r.id}`}>
                          <button className="btn btn-ghost btn-sm">Edit</button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {recent.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0da' }}>
            <Link href="/records" style={{ fontSize: 13, color: '#1B2B4B', fontWeight: 500 }}>View all records →</Link>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default function DashboardPage() {
  return <AuthProvider><Dashboard /></AuthProvider>
}
