import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { AuthProvider } from '../lib/AuthContext'
import Layout from '../components/Layout'
import toast from 'react-hot-toast'

function RecordsList() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    fetch(`/api/records?${params}`)
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }, [search, status, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <Layout
      title="All Records"
      subtitle={`${total} total records`}
      actions={
        <Link href="/records/new">
          <button className="btn btn-primary btn-sm">+ New Record</button>
        </Link>
      }
    >
      <div className="search-bar">
        <div className="search-input-wrap">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by order #, address, owner…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          style={{ padding: '8px 28px 8px 10px', border: '1px solid #e2e0da', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b6860' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', outline: 'none' }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b6860' }}>Loading…</div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <p>No records found{search ? ` for "${search}"` : ''}.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Search Type</th>
                  <th>Address</th>
                  <th>Owner</th>
                  <th>Buyer/Borrower</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500, color: '#1B2B4B' }}>{r.order_no}</td>
                    <td style={{ fontSize: 12, color: '#6b6860' }}>{r.search_type || '—'}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6b6860' }}>{r.address || '—'}</td>
                    <td>{r.owner || '—'}</td>
                    <td style={{ color: '#6b6860' }}>{r.buyer_borrower || '—'}</td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td style={{ color: '#6b6860', fontSize: 12 }}>{new Date(r.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/records/${r.id}`}>
                          <button className="btn btn-ghost btn-sm">Edit</button>
                        </Link>
                        <Link href={`/records/${r.id}/print`} target="_blank">
                          <button className="btn btn-ghost btn-sm">PDF</button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e0da', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6b6860' }}>Page {page} of {totalPages} · {total} records</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default function RecordsPage() {
  return <AuthProvider><RecordsList /></AuthProvider>
}
