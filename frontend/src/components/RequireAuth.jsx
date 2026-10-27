import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ admin = false, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page container center">Loading…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && !user.is_admin) {
    return (
      <div className="page container">
        <div className="card empty">
          <h3>Designer access only</h3>
          <p>Your account doesn't have designer (admin) permissions.</p>
        </div>
      </div>
    )
  }
  return children
}
