import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import DesignArt from '../components/DesignArt'
import DesignCard from '../components/DesignCard'
import HeroShowcase from '../components/HeroShowcase'

const FEATURES = [
  { icon: '🎨', title: 'Original designs', text: 'Every design is uploaded and curated by our designers, so you get work you won’t see everywhere else.' },
  { icon: '🔒', title: 'Secure accounts', text: 'Passwords are hashed with Argon2 and sessions use signed tokens, so your account stays yours.' },
  { icon: '⚡', title: 'Instant ordering', text: 'Add designs to your cart and check out in one step. Stock is reserved the moment you order.' },
  { icon: '📦', title: 'Order history', text: 'Every purchase is saved with the price you paid, so you can always look back at what you bought.' },
]

const FAQ = [
  ['How do I buy a design?', 'Create an account, add designs to your cart, and place your order from the cart page. You can see every order you have placed under “My Orders”.'],
  ['Why is a design marked “Sold out”?', 'Each design has a limited number of licences. When they’re all claimed, the design is sold out until the designer adds more.'],
  ['Is the price locked when I order?', 'Yes. Your order stores the price at the moment you checked out, even if the designer changes it later.'],
  ['How do I sell my designs?', 'Designer accounts get access to the Designer Console, where they can publish new designs, set prices and manage stock.'],
  ['Is my account secure?', 'Passwords are never stored in plain text, and login sessions expire automatically after a short period.'],
]

// Fixed star positions (percent of the hero) so the backdrop is identical on every render.
const DOTS = [
  [33, 14, 2], [44, 16, 2], [40, 25, 2], [58, 37, 3], [4.6, 62, 11], [98.3, 66, 8], [89, 95, 6], [55, 62, 2], [41, 68, 2],
  [93, 39, 2], [98, 54, 2], [96, 66, 3], [92, 82, 2], [53, 80, 2], [64, 30, 2], [72, 9, 2],
]

function HeroDots() {
  return (
    <div className="hero-dots" aria-hidden="true">
      {DOTS.map(([x, y, s], i) => (
        <span key={i} className={s > 4 ? 'lg' : undefined} style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${(i % 5) * 0.8}s` }} />
      ))}
    </div>
  )
}

export default function Home() {
  const [products, setProducts] = useState(null)

  useEffect(() => {
    api
      .listProducts(0, 100)
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  const featured = products?.slice(0, 8) ?? []
  const inStock = products?.filter((p) => p.stock > 0).length ?? 0
  const lowest = products?.length ? Math.min(...products.map((p) => Number(p.price))) : null

  return (
    <>
      <section className="hero">
        <HeroDots />
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>
              <span className="hero-line">Discover,</span> <span className="hero-line">buy, and create</span>{' '}
              <span className="hero-line">remarkable</span> <span className="hero-accent">Designs</span>
            </h1>
            <p className="hero-lead">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" />
              </svg>
              <span>
                A marketplace for original logos, illustrations, mockups and personalised jersey designs
              </span>
            </p>
            <div className="hero-ctas">
              <Link to="/designs" className="btn btn-light btn-lg">
                Browse Designs
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link to="/my-designs" className="btn btn-outline btn-lg">
                Create Your Design
              </Link>
            </div>
          </div>

          <HeroShowcase products={products} />
        </div>
      </section>

      <section className="stats-band">
        <div className="container stats">
          <div className="stat">
            <strong>{products ? products.length : '–'}</strong>
            <span>Designs listed</span>
          </div>
          <div className="stat">
            <strong>{products ? inStock : '–'}</strong>
            <span>Available now</span>
          </div>
          <div className="stat">
            <strong>{lowest !== null ? `₹${Math.floor(lowest)}` : '–'}</strong>
            <span>Starting price</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Why choose us</span>
            <h2>
              Built for <span className="gradient-text">creators and buyers</span>
            </h2>
            <p>Everything you need to discover great design, and everything designers need to sell it.</p>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <div key={f.title} className="card feature">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Featured</span>
            <h2>
              Fresh from our <span className="gradient-text">designers</span>
            </h2>
            <p>The latest designs on the marketplace.</p>
          </div>

          {products === null ? (
            <div className="grid">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : featured.length ? (
            <>
              <div className="grid">
                {featured.map((p) => (
                  <DesignCard key={p.id} product={p} />
                ))}
              </div>
              <div className="center" style={{ marginTop: 40 }}>
                <Link to="/designs" className="btn btn-ghost">
                  View all designs →
                </Link>
              </div>
            </>
          ) : (
            <div className="card empty">
              <h3>No designs yet</h3>
              <p>Designers haven’t published anything yet. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card sell">
            <div>
              <span className="eyebrow">For designers</span>
              <h2>
                Turn your designs into <span className="gradient-text">income</span>
              </h2>
              <p>Publish your work to a growing audience of buyers. You set the price, we handle the checkout.</p>
              <ul>
                <li>Publish designs in under a minute</li>
                <li>Set your own prices and stock</li>
                <li>Edit or retire designs any time</li>
              </ul>
              <Link to="/console" className="btn btn-primary">
                Open Designer Console →
              </Link>
            </div>
            <div className="sell-visual">
              {[11, 22, 33, 44].map((id, i) => (
                <div key={id}>
                  <DesignArt id={id} name={['Aurora', 'Nova', 'Pulse', 'Echo'][i]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">FAQ</span>
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
