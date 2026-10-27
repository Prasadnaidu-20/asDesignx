import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function LogoMark({ className = '' }) {
  return (
    <span className={`logo-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" fill="currentColor" />
        <path d="M12 7.5 16.5 12 12 16.5 7.5 12z" fill="var(--logo-hole, #000)" />
      </svg>
    </span>
  )
}

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="DesignHub home">
      <LogoMark />
      <span>DesignHub</span>
    </Link>
  )
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

const Chevron = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

// Disclosure menu for account pages, closed by outside click, Escape or picking an item.
function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = ({ isActive }) => `menu-item${isActive ? ' active' : ''}`

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="pill"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {user.full_name?.split(' ')[0] || 'Account'}
        <Chevron />
      </button>
      {open && (
        <div className="menu-list" onClick={() => setOpen(false)}>
          <NavLink to="/my-designs" className={item}>
            My Designs
          </NavLink>
          <NavLink to="/orders" className={item}>
            My Orders
          </NavLink>
          {user.is_admin && (
            <NavLink to="/console" className={item}>
              Designer Console
            </NavLink>
          )}
          <button type="button" className="menu-item" onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const pill = ({ isActive }) => `pill${isActive ? ' active' : ''}`

  const onSearch = (e) => {
    e.preventDefault()
    navigate(q.trim() ? `/designs?q=${encodeURIComponent(q.trim())}` : '/designs')
    setOpen(false)
  }

  const onLogout = () => {
    logout()
    navigate('/')
  }

  const search = (
    <form className="nav-search" onSubmit={onSearch} role="search">
      <SearchIcon />
      <input
        type="search"
        placeholder="Search designs"
        aria-label="Search designs"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  )

  return (
    <header className="nav">
      <div className="nav-shell">
        <Logo />

        <div className="nav-center">{search}</div>

        <button
          type="button"
          className="nav-toggle pill"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="nav-links"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <nav
          id="nav-links"
          className={`nav-links${open ? ' open' : ''}`}
          aria-label="Main"
          // Close the mobile panel once a destination is picked (links and the log-out item).
          onClick={(e) => e.target.closest('a, .menu-item') && setOpen(false)}
        >
          <div className="nav-mobile-search">{search}</div>
          <NavLink to="/" end className={pill}>
            Home
          </NavLink>
          <NavLink to="/designs" className={pill}>
            Browse
          </NavLink>
          <NavLink to="/cart" className={pill}>
            Cart
            {count > 0 && <span className="cart-badge">{count}</span>}
          </NavLink>
          {user ? (
            <AccountMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <NavLink to="/login" className={pill}>
                Log in
              </NavLink>
              <Link to="/register" className="pill pill-light">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
