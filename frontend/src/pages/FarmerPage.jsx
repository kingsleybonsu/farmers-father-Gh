import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

const avatarStyles = {
  male: { symbol: '👨‍🌾', color: '#d9f0ff' },
  female: { symbol: '👩‍🌾', color: '#fce7f3' },
  neutral: { symbol: '🌾', color: '#e7f6e9' },
  farm: { symbol: '🚜', color: '#fff0d5' },
};

function FarmerPage() {
  const { farmerId } = useParams();
  const [farmer, setFarmer] = useState(null);
  const [produce, setProduce] = useState([]);
  const [totalProduce, setTotalProduce] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');

    api.get(`/produce/farmers/${farmerId}`, {
      params: { page: 1 },
      signal: controller.signal,
    }).then((response) => {
      if (currentRequest !== requestId.current) return;
      setFarmer(response.data.farmer);
      setProduce(response.data.produce);
      setTotalProduce(response.data.totalProduce);
      setPage(1);
      setHasMore(response.data.hasMore);
    }).catch((err) => {
      if (err.name !== 'CanceledError' && currentRequest === requestId.current) {
        setError(getUserFriendlyErrorMessage(err, 'Unable to load this farmer.'));
      }
    }).finally(() => {
      if (currentRequest === requestId.current) setLoading(false);
    });

    return () => controller.abort();
  }, [farmerId]);

  const loadMore = async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/produce/farmers/${farmerId}`, {
        params: { page: page + 1 },
      });
      if (currentRequest === requestId.current) {
        setProduce((current) => [...current, ...response.data.produce]);
        setTotalProduce(response.data.totalProduce);
        setPage(response.data.page);
        setHasMore(response.data.hasMore);
      }
    } catch (err) {
      if (currentRequest === requestId.current) {
        setError(getUserFriendlyErrorMessage(err, 'Unable to load more produce. Please try again.'));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  const avatar = avatarStyles[farmer?.avatarStyle] || avatarStyles.neutral;

  return (
    <section className="page-card farmer-detail-page">
      <Link className="farmer-back-link" to="/">← Marketplace</Link>
      {error && <div className="form-error">{error}</div>}
      {loading && !farmer ? (
        <p className="empty-state">Loading farmer...</p>
      ) : farmer ? (
        <>
          <header className="farmer-detail-header">
            <div className="farmer-profile-avatar" style={{ backgroundColor: avatar.color }}>
              <span>{avatar.symbol}</span>
            </div>
            <div>
              <p className="eyebrow">Farmer profile</p>
              <h1>{farmer.name}</h1>
              <p>{farmer.farmName}</p>
            </div>
          </header>
          <div className="farmer-detail-listings-heading">
            <h2>Available produce</h2>
            <span>{produce.length} of {totalProduce} shown</span>
          </div>
          {produce.length ? (
            <div className="farmer-detail-produce-list">
              {produce.map((item) => (
                <article key={item._id} className="farmer-produce-item">
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
                    <span>{item.quantity} units</span>
                    <strong>₵{Number(item.price).toFixed(2)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">This farmer has no active produce listings.</p>
          )}
          {hasMore && (
            <button className="load-more-button" type="button" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load more produce'}
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}

export default FarmerPage;