import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div>
          <h2>FARMERS FATHER GH</h2>
          <p> Connecting local farmers directly to buyers across Ghana.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Marketplace</Link>
          <Link to="/sell">Sell Produce</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </div>
      <p className="footer-note">© {new Date().getFullYear()} FARMERS FATHER GH. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
