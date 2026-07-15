import { Link } from 'react-router-dom'

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-card/70">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 md:grid-cols-4 lg:px-8">
        <div>
          <h4 className="mb-3 text-lg font-semibold">SevaLink</h4>
          <p className="text-sm text-muted-foreground">Premium service booking platform for homes, businesses, and communities.</p>
        </div>
        <div>
          <h5 className="mb-3 font-semibold">Explore</h5>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/services" className="block hover:text-primary">Services</Link>
            <Link to="/categories" className="block hover:text-primary">Categories</Link>
            <Link to="/providers" className="block hover:text-primary">Providers</Link>
          </div>
        </div>
        <div>
          <h5 className="mb-3 font-semibold">Portals</h5>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/customer" className="block hover:text-primary">Customer Dashboard</Link>
            <Link to="/provider" className="block hover:text-primary">Provider Dashboard</Link>
            <Link to="/sevalink-admin" className="block hover:text-primary">Admin Panel</Link>
          </div>
        </div>
        <div>
          <h5 className="mb-3 font-semibold">Support</h5>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>help@sevalink.app</p>
            <p>+91 99999 12345</p>
            <p>24x7 Service Desk</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
