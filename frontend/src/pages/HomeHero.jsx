import { Link } from 'react-router-dom';

function HomeHero() {
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
          <Link className="primary-button hero-button" to="/register">
            Become a Farmer
          </Link>
          <Link className="secondary-button hero-button" to="/">
           View Available Produce
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
