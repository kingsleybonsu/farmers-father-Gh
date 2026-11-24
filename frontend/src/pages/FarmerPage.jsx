import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';
import { useCart } from '../context/CartContext.jsx';

const avatarStyles = {
  male: { symbol: '👨‍🌾', color: '#d9f0ff' },
  female: { symbol: '👩‍🌾', color: '#fce7f3' },
  neutral: { symbol: '🌾', color: '#e7f6e9' },
  farm: { symbol: '🚜', color: '#fff0d5' },
};

const produceStatusLabels = {
  available: 'Available',
  sold_out: 'Sold out',
  coming_soon: 'Coming soon',
};

function FarmerProduceItem({ item, farmerId, farmName, highlightedProduceId }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const confirmationTimer = useRef(null);
  const { addItem } = useCart();
  const status = item.status || 'available';
  const stock = Math.max(0, Math.floor(Number(item.quantity) || 0));
  const unavailable = status === 'sold_out' || status === 'coming_soon' || stock < 1;
  const buttonLabel = status === 'sold_out'
    ? 'Sold out'
    : status === 'coming_soon'
      ? 'Coming soon'
      : 'Add to cart';

  useEffect(() => () => window.clearTimeout(confirmationTimer.current), []);

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, stock)));
  }, [stock]);

  const handleAddToCart = () => {
    addItem({
      produceId: item._id,
      name: item.name,
      unit: item.unit || 'unit',
      unitPrice: Number(item.price),
      maxQuantity: stock,
      imageUrl: item.imageUrl || '',
      farmerId,
      farmName,
    }, quantity);
    setAdded(true);
    window.clearTimeout(confirmationTimer.current);
    confirmationTimer.current = window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article
      id={`farmer-produce-${item._id}`}
      className={`farmer-produce-item${status === 'sold_out' ? ' sold-out' : ''}${highlightedProduceId === item._id ? ' marketplace-target-highlight' : ''}`}
    >
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
        <span className={`produce-status-badge ${status}`}>{produceStatusLabels[status] || produceStatusLabels.available}</span>
        <span>{item.quantity} {item.unit || 'unit'} available</span>
        <strong>₵{Number(item.price).toFixed(2)} per {item.unit || 'unit'}</strong>
      </div>
      <div className="cart-add-controls">
        <div className="quantity-stepper" aria-label={`Quantity for ${item.name}`}>
          <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={unavailable || quantity <= 1}>−</button>
          <span aria-live="polite">{quantity}</span>
          <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantity((current) => Math.min(stock, current + 1))} disabled={unavailable || quantity >= stock}>+</button>
        </div>
        <button className="add-to-cart-button" type="button" onClick={handleAddToCart} disabled={unavailable}>
          {added ? 'Added to cart' : unavailable ? buttonLabel : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}

function FarmerPage() {
  const { farmerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [farmer, setFarmer] = useState(null);
  const [produce, setProduce] = useState([]);
  const [totalProduce, setTotalProduce] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightedProduceId, setHighlightedProduceId] = useState('');
  const [loadedFarmerId, setLoadedFarmerId] = useState('');
  const requestId = useRef(0);
  const handledHighlightRequests = useRef(new Set());
  const listingsRef = useRef({ produce, page, hasMore });
  const loadingRef = useRef(loading);
  listingsRef.current = { produce, page, hasMore };
  loadingRef.current = loading;
  const targetProduceId = searchParams.get('produce');

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
      setLoadedFarmerId(farmerId);
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

  useEffect(() => {
    if (
      !targetProduceId ||
      !farmer ||
      loadedFarmerId !== farmerId ||
      loadingRef.current
    ) return undefined;

    const requestKey = `${farmerId}:${targetProduceId}`;
    if (handledHighlightRequests.current.has(requestKey)) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    let loadedProduce = listingsRef.current.produce;
    let currentPage = listingsRef.current.page;
    let morePages = listingsRef.current.hasMore;

    const clearTargetParameter = () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('produce');
      setSearchParams(nextParams, { replace: true });
    };

    const findAndHighlightProduce = async () => {
      let targetItem = loadedProduce.find(
        (item) => item._id === targetProduceId,
      );

      while (!targetItem && morePages && !cancelled) {
        setLoading(true);
        const response = await api.get(`/produce/farmers/${farmerId}`, {
          params: { page: currentPage + 1 },
          signal: controller.signal,
        });
        if (cancelled) return;

        loadedProduce = [...loadedProduce, ...response.data.produce];
        currentPage = response.data.page;
        morePages = response.data.hasMore;
        setProduce(loadedProduce);
        setTotalProduce(response.data.totalProduce);
        setPage(currentPage);
        setHasMore(morePages);
        targetItem = loadedProduce.find(
          (item) => item._id === targetProduceId,
        );
      }

      if (cancelled) return;
      if (targetItem) {
        setHighlightedProduceId(targetProduceId);
      }
      handledHighlightRequests.current.add(requestKey);
      setLoading(false);
      clearTargetParameter();
    };

    findAndHighlightProduce().catch((err) => {
      if (!cancelled) {
        handledHighlightRequests.current.add(requestKey);
        setError(getUserFriendlyErrorMessage(err, 'Unable to load this produce item.'));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    targetProduceId,
    farmerId,
    farmer,
    loadedFarmerId,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!highlightedProduceId) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      document
        .getElementById(`farmer-produce-${highlightedProduceId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const timeoutId = window.setTimeout(
      () => setHighlightedProduceId(''),
      2000,
    );

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [highlightedProduceId]);

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
          <aside className="safety-notice" role="note">
            <span className="safety-notice-icon" aria-hidden="true">i</span>
            <p>Safety tip: Never pay before you see the produce. Pay on delivery or on pickup. Farmers Father will never ask you to pay through a link or a phone call.</p>
          </aside>
          <div className="farmer-detail-listings-heading">
            <h2>Available produce</h2>
            <span>{produce.length} of {totalProduce} shown</span>
          </div>
          {produce.length ? (
            <div className="farmer-detail-produce-list">
              {produce.map((item) => (
                <FarmerProduceItem
                  key={item._id}
                  item={item}
                  farmerId={farmerId}
                  farmName={farmer.farmName}
                  highlightedProduceId={highlightedProduceId}
                />
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