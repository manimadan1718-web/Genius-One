import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth, AuthProvider } from '../lib/AuthContext'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: '/records', label: 'All Records', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg> },
  { href: '/records/new', label: 'New Record', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
]

const ADMIN_NAV = [
  { href: '/users', label: 'Users', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
]

function SidebarContent() {
  const { user, logout } = useAuth()
  const router = useRouter()

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-circle">G</div>
        <div className="logo-text">
          GeniusOne
          <small>Typing Portal</small>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Menu</div>
        {NAV.map(n => (
          <Link key={n.href} href={n.href}>
            <div className={`nav-item${router.pathname === n.href || router.pathname.startsWith(n.href + '/') ? ' active' : ''}`}>
              {n.icon}
              {n.label}
            </div>
          </Link>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="nav-label">Admin</div>
            {ADMIN_NAV.map(n => (
              <Link key={n.href} href={n.href}>
                <div className={`nav-item${router.pathname === n.href ? ' active' : ''}`}>
                  {n.icon}
                  {n.label}
                </div>
              </Link>
            ))}
          </>
        )}
      </div>

      <div className="sidebar-bottom">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{user?.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role}</div>
          </div>
        </div>
        <button onClick={logout} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: 'background 0.15s' }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.14)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
        >Sign out</button>
      </div>
    </div>
  )
}

export default function Layout({ children, title, subtitle, actions }) {
  const { user, loading } = useAuth ? useAuth() : {}
  const router = useRouter()

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6860', fontSize: 14 }}>Loading…</div>

  return (
    <div className="page">
      <SidebarContent />
      <div className="main">
        <div className="topbar">
          <div>
            {title && <div style={{ fontWeight: 500, fontSize: 15, color: '#1B2B4B' }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: '#6b6860' }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {actions}
          </div>
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  )
}

export function withLayout(Component, layoutProps = {}) {
  return function WrappedPage(props) {
    return (
      <AuthProvider>
        <Layout {...(typeof layoutProps === 'function' ? layoutProps(props) : layoutProps)}>
          <Component {...props} />
        </Layout>
      </AuthProvider>
    )
  }
}
