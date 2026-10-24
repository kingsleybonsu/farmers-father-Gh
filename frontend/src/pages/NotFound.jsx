import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="page-card">
      <h1>Page not found</h1>
      <p>We couldn’t find the page you were looking for.</p>
      <Link className="primary-button" to="/">Back to marketplace</Link>
    </section>
  );
}

export default NotFound;