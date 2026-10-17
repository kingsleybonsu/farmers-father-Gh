function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div>
          <h2>FARMERS FATHER GH</h2>
          <p> Connecting local farmers directly to buyers across Ghana.</p>
        </div>
        <div className="footer-links">
          <a href="/">Marketplace</a>
          <a href="/sell">Sell Produce</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </div>
      <p className="footer-note">© {new Date().getFullYear()} FARMERS FATHER GH. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
