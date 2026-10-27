import { Link } from 'react-router-dom'
import { Logo } from './Navbar'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="mt-2">
              A marketplace for original designs: logos, illustrations, mockups and more, ready to buy and use.
            </p>
          </div>
          <div>
            <h4>Marketplace</h4>
            <ul>
              <li>
                <Link to="/designs">Browse designs</Link>
              </li>
              <li>
                <Link to="/cart">Cart</Link>
              </li>
              <li>
                <Link to="/orders">My orders</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li>
                <Link to="/login">Log in</Link>
              </li>
              <li>
                <Link to="/register">Create account</Link>
              </li>
              <li>
                <Link to="/console">Designer console</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li>
                <Link to="/#faq">FAQ</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {YEAR} DesignHub. All rights reserved.</span>
          <span>Built with FastAPI + React</span>
        </div>
      </div>
    </footer>
  )
}
