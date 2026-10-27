import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import RequireAuth from './components/RequireAuth'
import { Login, Register } from './pages/Auth'
import Browse from './pages/Browse'
import Cart from './pages/Cart'
import Console from './pages/Console'
import DesignDetail from './pages/DesignDetail'
import Home from './pages/Home'
import MyDesigns from './pages/MyDesigns'
import Orders from './pages/Orders'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function NotFound() {
  return (
    <div className="page container">
      <div className="card empty">
        <h3>Page not found</h3>
        <p>The page you’re looking for doesn’t exist.</p>
        <Link to="/" className="btn btn-primary">
          Go home
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/designs" element={<Browse />} />
          <Route path="/designs/:id" element={<DesignDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <Orders />
              </RequireAuth>
            }
          />
          <Route
            path="/my-designs"
            element={
              <RequireAuth>
                <MyDesigns />
              </RequireAuth>
            }
          />
          <Route
            path="/console"
            element={
              <RequireAuth admin>
                <Console />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
