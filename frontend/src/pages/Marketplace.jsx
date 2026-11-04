import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

const categories = ['All', 'Fruits', 'Vegetables', 'Grains', 'Tubers', 'Livestock'];
const produceStatusLabels = {
  available: 'Available',
  sold_out: 'Sold out',
  coming_soon: 'Coming soon',
};
const avatarStyles = {
  male: { symbol: '👨‍🌾', color: '#d9f0ff' },
  female: { symbol: '👩‍🌾', color: '#fce7f3' },
  neutral: { symbol: '🌾', color: '#e7f6e9' },
  farm: { symbol: '🚜', color: '#fff0d5' },
};

function Marketplace({ setSuggestions, setActiveSuggestion, setSuggestionsDismissed }) {
  const [farmers, setFarmers] = useState([]);
  const [category, setCategory] = useState('All');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSuggestionQuery(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const query = suggestionQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setActiveSuggestion(-1);
      return undefined;
    }

    const controller = new AbortController();
    api.get('/produce/suggestions', {
      params: {
        q: query,
        ...(category !== 'All' ? { category } : {}),
      },
      signal: controller.signal,
    }).then((response) => {
      setSuggestions(response.data.suggestions.slice(0, 5));
      setActiveSuggestion(-1);
    }).catch((err) => {
      if (err.name !== 'CanceledError') setSuggestions([]);
    });

    return () => controller.abort();
  }, [suggestionQuery, category]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;

    const fetchFarmers = async () => {
      setLoading(true);
      setError('');
      setFarmers([]);
      setPage(1);

      try {
        const response = await api.get('/produce', {
          params: {
            page: 1,
            ...(category !== 'All' ? { category } : {}),
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
          },
          signal: controller.signal,
        });
        if (currentRequest === requestId.current) {
          setFarmers(response.data.farmers);
          setHasMore(response.data.hasMore);
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && currentRequest === requestId.current) {
          setError(getUserFriendlyErrorMessage(err, 'Unable to load marketplace farmers.'));
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    };

    fetchFarmers();
    return () => controller.abort();
  }, [category, debouncedSearch]);

  const loadMore = async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/produce', {
        params: {
          page: page + 1,
          ...(category !== 'All' ? { category } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });
      if (currentRequest === requestId.current) {
        setFarmers((current) => [...current, ...response.data.farmers]);
        setPage(response.data.page);
        setHasMore(response.data.hasMore);
      }
    } catch (err) {
      if (currentRequest === requestId.current) {
        setError(getUserFriendlyErrorMessage(err, 'Unable to load more farmers. Please try again.'));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  return (
    <section id="marketplace" className="page-card">
      <div className="marketplace-header">
        <h1>Marketplace</h1>
      </div>
      <div className="marketplace-filters">
        <div className="category-tabs">
          {categories.map((item) => (
            <button
              key={item}
              className={item === category ? 'tab active' : 'tab'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <aside className="safety-notice compact" role="note">
        <span className="safety-notice-icon" aria-hidden="true">i</span>
        <p>Never pay before you see the produce.</p>
      </aside>
      <div className="farmer-card-grid">
        {loading && farmers.length === 0 ? (
          <p className="empty-state">Loading farmers...</p>
        ) : farmers.length === 0 ? (
          <p className="empty-state">
            {debouncedSearch ? 'No farmers or produce match your search.' : 'No produce listings found.'}
          </p>
        ) : (
          farmers.map((farmer) => {
            const avatar = avatarStyles[farmer.avatarStyle] || avatarStyles.neutral;

            return (
              <article key={farmer.id} className="farmer-profile-card">
                <Link className="farmer-profile-link" to={`/farmers/${farmer.id}`}>
                  <div className="farmer-profile-header">
                    <div className="farmer-profile-avatar" style={{ backgroundColor: avatar.color }}>
                      <span>{avatar.symbol}</span>
                    </div>
                    <div>
                      <h2>{farmer.farmerName}</h2>
                      <p>{farmer.farmName}</p>
                    </div>
                  </div>
                </Link>

                <div className="farmer-produce-list">
                  {farmer.items.map((item) => (
                    <div key={item._id} className={`farmer-produce-item${item.status === 'sold_out' ? ' sold-out' : ''}`}>
                      <div className="marketplace-produce-image">
                        <span className="marketplace-image-fallback" aria-hidden="true">🌾</span>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            onError={(event) => event.currentTarget.remove()}
                          />
                        )}
                      </div>
                      <div className="farmer-product-name-block">
                        <span className="farmer-produce-category">{item.category}</span>
                        <h3>{item.name}</h3>
                        <span className="farmer-produce-location">{item.location}</span>
                      </div>
                      <div className="farmer-produce-meta">
                        <span className={`produce-status-badge ${item.status || 'available'}`}>{produceStatusLabels[item.status] || produceStatusLabels.available}</span>
                        <span>{item.quantity} {item.unit || 'unit'}</span>
                        <strong>₵{Number(item.price).toFixed(2)} / {item.unit || 'unit'}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                {farmer.totalProduce > farmer.items.length && (
                  <Link className="farmer-more-link" to={`/farmers/${farmer.id}`}>
                    +{farmer.totalProduce - farmer.items.length} more · View farmer
                  </Link>
                )}
              </article>
            );
          })
        )}
      </div>
      {hasMore && (
        <button className="load-more-button" type="button" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load more farmers'}
        </button>
      )}
    </section>
  );
}

export default Marketplace;
