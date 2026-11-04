import { Link } from 'react-router-dom';

function HomeHero({ isAuthenticated }) {
  const handleScrollToMarketplace = (e) => {
    e.preventDefault();
    const marketplaceEl = document.getElementById('marketplace');
    if (marketplaceEl) {
      marketplaceEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">Fresh from the farm</p>
        <h1> Connecting local farmers directly to buyers across Ghana.</h1>
        <p>
          Discover farm-fresh fruits, grains, tubers, and livestock listings from real local growers.
          Join the marketplace and start selling or buying today.
        </p>
        <div className="hero-actions">
          {isAuthenticated ? (
            <Link className="primary-button hero-button" to="/dashboard">
              Go to Dashboard
            </Link>
          ) : (
            <Link className="primary-button hero-button" to="/register">
              Become a Farmer
            </Link>
          )}
          <a
            className="secondary-button hero-button"
            href="#marketplace"
            onClick={handleScrollToMarketplace}
          >
            View Available Produce
          </a>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
