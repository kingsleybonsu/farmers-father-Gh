import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import buyerApi from '../api/buyerApi.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';
import { groupItemsByFarmer, useCart } from '../context/CartContext.jsx';

function Cart({ isAuthenticated, isBuyerAuthenticated, onFarmerLogout }) {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const farmerGroups = useMemo(() => groupItemsByFarmer(items), [items]);
  const grandTotal = useMemo(
    () => farmerGroups.reduce((total, group) => total + group.subtotal, 0),
    [farmerGroups],
  );
  const [buyer, setBuyer] = useState(null);
  const [isLoadingBuyer, setIsLoadingBuyer] = useState(false);
  const [buyerError, setBuyerError] = useState('');
  const [fulfilment, setFulfilment] = useState('pickup');
  const [pickupArea, setPickupArea] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    if (!isBuyerAuthenticated || !items.length) {
      setBuyer(null);
      setBuyerError('');
      setIsLoadingBuyer(false);
      return undefined;
    }

    const controller = new AbortController();
    setBuyer(null);
    setBuyerError('');
    setIsLoadingBuyer(true);

    buyerApi.get('/buyers/me', { signal: controller.signal })
      .then((response) => setBuyer(response.data.buyer))
      .catch((error) => {
        if (error.name !== 'CanceledError') {
          setBuyerError(
            getUserFriendlyErrorMessage(
              error,
              'Unable to load your buyer profile.',
            ),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingBuyer(false);
      });

    return () => controller.abort();
  }, [isBuyerAuthenticated, items.length]);

  const handleSubmitOrder = async (event) => {
    event.preventDefault();
    if (isSubmitting || !items.length) return;

    setIsSubmitting(true);
    setOrderError('');
    try {
      const response = await buyerApi.post('/orders', {
        fulfilment,
        pickupArea: pickupArea.trim(),
        note: note.trim(),
        items: items.map(({ produceId, quantity }) => ({ produceId, quantity })),
      });
      clearCart();
      navigate('/order-success', {
        state: { orderResponse: response.data },
      });
    } catch (error) {
      setOrderError(
        error.response?.data?.message ||
          getUserFriendlyErrorMessage(
            error,
            'Unable to send your order request. Please try again.',
          ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <section className="page-card cart-page">
        <h1>Your cart</h1>
        <div className="cart-empty-state">
          <p>Your cart is empty. Browse the marketplace to find fresh produce.</p>
          <Link className="primary-button" to="/">Browse produce</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card cart-page">
      <h1>Your cart</h1>
      <div className="cart-farmer-groups">
        {farmerGroups.map((group) => (
          <section className="cart-farmer-group" key={group.farmerId}>
            <header className="cart-farm-header">
              <h2>
                <Link to={`/farmers/${group.farmerId}`}>{group.farmName}</Link>
              </h2>
              <strong>Subtotal: ₵{group.subtotal.toFixed(2)}</strong>
            </header>
            <ul className="cart-item-list">
              {group.items.map((item) => (
                <li className="cart-item" key={item.produceId}>
                  <div className="cart-item-image">
                    <span aria-hidden="true">🌾</span>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        onError={(event) => event.currentTarget.remove()}
                      />
                    )}
                  </div>
                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <span>₵{item.unitPrice.toFixed(2)} per {item.unit}</span>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-stepper" aria-label={`Quantity for ${item.name}`}>
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() => updateQuantity(item.produceId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        onClick={() => updateQuantity(item.produceId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="cart-remove-button"
                      type="button"
                      onClick={() => removeItem(item.produceId)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="cart-summary" aria-label="Cart total">
        <strong>Grand total <span>₵{grandTotal.toFixed(2)}</span></strong>
        <p>Each farm's items are sent as a separate order. You pay the farmer when you pick up or receive your produce.</p>
        <p className="cart-safety-note">Never pay before you see the produce.</p>
        <p className="cart-estimate-note">Prices on this page are estimates; the final price is confirmed when the order is sent.</p>
      </section>

      <section className="cart-checkout">
        <h2>Checkout</h2>
        {isBuyerAuthenticated ? (
          <>
            <p className="checkout-ordering-as">
              {buyer
                ? `Ordering as ${buyer.name} · ${buyer.phone}`
                : isLoadingBuyer
                  ? 'Loading your buyer details...'
                  : ''}
            </p>
            {buyerError && <div className="form-error" role="alert">{buyerError}</div>}
            <form className="form-grid" onSubmit={handleSubmitOrder}>
              <fieldset className="checkout-fulfilment">
                <legend>Fulfilment</legend>
                <label>
                  <input
                    type="radio"
                    name="fulfilment"
                    value="pickup"
                    checked={fulfilment === 'pickup'}
                    onChange={() => setFulfilment('pickup')}
                    disabled={isSubmitting}
                  />
                  Pickup
                </label>
                <label>
                  <input
                    type="radio"
                    name="fulfilment"
                    value="delivery"
                    checked={fulfilment === 'delivery'}
                    onChange={() => setFulfilment('delivery')}
                    disabled={isSubmitting}
                  />
                  Delivery
                </label>
              </fieldset>
              <label>
                {fulfilment === 'pickup' ? 'Pickup area' : 'Delivery area'}
                <input
                  type="text"
                  value={pickupArea}
                  onChange={(event) => setPickupArea(event.target.value)}
                  maxLength={80}
                  autoComplete="address-level2"
                  required
                  disabled={isSubmitting}
                />
              </label>
              <label>
                Note (optional)
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={300}
                  rows={3}
                  disabled={isSubmitting}
                />
              </label>
              {orderError && <div className="form-error" role="alert">{orderError}</div>}
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting || isLoadingBuyer || !buyer || Boolean(buyerError)}
              >
                {isSubmitting ? 'Sending...' : 'Send order request'}
              </button>
            </form>
          </>
        ) : isAuthenticated ? (
          <div className="cart-checkout-notice">
            <p>You're logged in as a farmer. Log in as a buyer to place an order.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => onFarmerLogout('/login?role=buyer', { from: '/cart' })}
            >
              Log in as a buyer
            </button>
          </div>
        ) : (
          <div className="cart-checkout-notice">
            <p>Log in or create an account to place your order.</p>
            <div className="cart-checkout-links">
              <Link
                className="primary-button"
                to="/login?role=buyer"
                state={{ from: '/cart' }}
              >
                Log in
              </Link>
              <Link
                className="secondary-button"
                to="/register?role=buyer"
                state={{ from: '/cart' }}
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export default Cart;
