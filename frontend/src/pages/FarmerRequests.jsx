import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

const REQUEST_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

const DECLINE_REASONS = [
  'Out of stock',
  'Out of season',
  'Cannot reach this area',
  'Other',
];

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const fetchOrders = async (page, status, signal) => {
  const params = { page };
  if (status !== 'all') params.status = status;
  const response = await api.get('/orders/farmer', { params, signal });
  return response.data;
};

const formatMoney = (value) => `₵${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function RequestSkeleton() {
  return (
    <div className="farmer-requests-skeleton-list" aria-label="Loading requests">
      {[0, 1, 2].map((item) => (
        <div className="farmer-requests-skeleton-card" key={item}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function RequestCard({
  order,
  actionError,
  updateStock,
  accepting,
  declining,
  confirmationOpen,
  declineFormOpen,
  onBeginAccept,
  onConfirmAccept,
  onBeginDecline,
  onDecline,
  onCancelAction,
}) {
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const status = order.status || 'pending';
  const helper =
    status === 'accepted'
      ? 'Collect payment only when the buyer picks up or receives the produce.'
      : status === 'declined' && order.declineReason
        ? `Decline reason: ${order.declineReason}`
        : '';
  const actionBusy = accepting || declining;

  return (
    <article className="farmer-request-card">
      <header className="farmer-request-header">
        <div className="farmer-request-buyer">
          <h2>{order.buyerName || 'Buyer'}</h2>
          <p>{order.buyerPhone}</p>
        </div>
        <span className={`farmer-request-status status-${status}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </header>

      <p className="farmer-request-date">{formatDate(order.createdAt)}</p>

      <ul className="farmer-request-items">
        {(order.items || []).map((item, index) => (
          <li key={`${item.produce || item._id || item.name || 'item'}-${index}`}>
            <span className="farmer-request-item-name">
              {item.name} · {item.quantity} {item.unit}
            </span>
            <span>{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="farmer-request-total">
        <strong>Order total</strong>
        <strong>{formatMoney(order.total)}</strong>
      </div>

      <dl className="farmer-request-details">
        <div>
          <dt>Fulfilment</dt>
          <dd>{order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</dd>
        </div>
        {order.pickupArea && (
          <div>
            <dt>{order.fulfilment === 'delivery' ? 'Delivery area' : 'Pickup area'}</dt>
            <dd>{order.pickupArea}</dd>
          </div>
        )}
        {order.note && (
          <div>
            <dt>Note</dt>
            <dd>{order.note}</dd>
          </div>
        )}
      </dl>

      {helper && (
        <p className={`farmer-request-helper status-${status}`}>{helper}</p>
      )}

      {actionError && (
        <div className="form-error farmer-request-error" role="alert">
          <p>{actionError}</p>
          {updateStock && <Link to="/produce">Update my stock</Link>}
        </div>
      )}

      {status === 'pending' && (
        <div className="farmer-request-actions">
          {confirmationOpen ? (
            <div className="farmer-request-confirm">
              <p>Accept this order? Your stock will be reduced.</p>
              <div>
                <button
                  type="button"
                  className="farmer-request-accept"
                  onClick={onConfirmAccept}
                  disabled={actionBusy}
                >
                  {accepting ? 'Accepting...' : 'Yes, accept'}
                </button>
                <button
                  type="button"
                  className="farmer-request-secondary"
                  onClick={onCancelAction}
                  disabled={actionBusy}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : declineFormOpen ? (
            <form
              className="farmer-request-decline-form"
              onSubmit={(event) => {
                event.preventDefault();
                onDecline(
                  declineReason === 'Other' ? otherReason.trim() : declineReason,
                );
              }}
            >
              <label>
                Reason
                <select
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  disabled={actionBusy}
                >
                  {DECLINE_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>
              {declineReason === 'Other' && (
                <label>
                  Optional reason
                  <textarea
                    value={otherReason}
                    onChange={(event) => setOtherReason(event.target.value)}
                    maxLength={200}
                    rows={3}
                    disabled={actionBusy}
                  />
                </label>
              )}
              <div>
                <button
                  type="submit"
                  className="farmer-request-decline"
                  disabled={actionBusy}
                >
                  {declining ? 'Declining...' : 'Decline order'}
                </button>
                <button
                  type="button"
                  className="farmer-request-secondary"
                  onClick={onCancelAction}
                  disabled={actionBusy}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                className="farmer-request-accept"
                onClick={onBeginAccept}
                disabled={actionBusy}
              >
                Accept
              </button>
              <button
                type="button"
                className="farmer-request-decline"
                onClick={onBeginDecline}
                disabled={actionBusy}
              >
                Decline
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function FarmerRequests() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState('refresh');
  const [actionErrors, setActionErrors] = useState({});
  const [stockErrors, setStockErrors] = useState({});
  const [confirmationOrderId, setConfirmationOrderId] = useState('');
  const [declineOrderId, setDeclineOrderId] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const currentFilterRef = useRef(statusFilter);
  const refreshOrdersRef = useRef(null);
  currentFilterRef.current = statusFilter;

  useEffect(() => {
    const controller = new AbortController();
    setOrders([]);
    setPage(1);
    setHasMore(false);
    setError('');
    setActionErrors({});
    setStockErrors({});
    setIsLoading(true);
    setRetryAction('refresh');

    fetchOrders(1, statusFilter, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setPage(data.page || 1);
        setHasMore(Boolean(data.hasMore));
      })
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') {
          setRetryAction('refresh');
          setError(
            getUserFriendlyErrorMessage(
              requestError,
              'Unable to load order requests.',
            ),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [statusFilter]);

  const refreshOrders = useCallback(async () => {
    const targetPage = page;
    const controller = new AbortController();
    setError('');
    setRetryAction('refresh');
    setIsRefreshing(true);

    try {
      const loaded = [];
      let nextPage = 1;
      let nextHasMore = false;
      do {
        const data = await fetchOrders(nextPage, statusFilter, controller.signal);
        loaded.push(...(Array.isArray(data.orders) ? data.orders : []));
        nextHasMore = Boolean(data.hasMore);
        if (nextPage >= targetPage || !nextHasMore) break;
        nextPage += 1;
      } while (true);

      if (currentFilterRef.current !== statusFilter) return;
      setOrders(loaded);
      setPage(nextPage);
      setHasMore(nextHasMore);
    } catch (requestError) {
      setRetryAction('refresh');
      setError(
        getUserFriendlyErrorMessage(
          requestError,
          'Unable to load order requests.',
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    refreshOrdersRef.current = refreshOrders;
  }, [refreshOrders]);

  useEffect(() => {
    const handleFocus = () => refreshOrdersRef.current?.();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    const filterAtRequest = statusFilter;
    setIsLoadingMore(true);
    setError('');
    try {
      const data = await fetchOrders(nextPage, filterAtRequest);
      if (currentFilterRef.current !== filterAtRequest) return;
      const nextOrders = Array.isArray(data.orders) ? data.orders : [];
      setOrders((current) => {
        const existingIds = new Set(current.map((order) => order._id));
        return [
          ...current,
          ...nextOrders.filter((order) => !existingIds.has(order._id)),
        ];
      });
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (requestError) {
      setRetryAction('loadMore');
      setError(
        getUserFriendlyErrorMessage(
          requestError,
          'Unable to load more requests.',
        ),
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleOrderStatus = async (order, status, declineReason = '') => {
    if (updatingOrderId) return;
    setUpdatingOrderId(order._id);
    setActionErrors((current) => ({ ...current, [order._id]: '' }));
    setStockErrors((current) => ({ ...current, [order._id]: false }));

    try {
      await api.put(`/orders/${order._id}/status`, { status, declineReason });
      setOrders((current) =>
        current.map((item) =>
          item._id === order._id
            ? {
                ...item,
                status,
                declineReason: status === 'declined' ? declineReason : '',
              }
            : item,
        ),
      );
      window.dispatchEvent(new Event('farmer:orders-updated'));
      setConfirmationOrderId('');
      setDeclineOrderId('');
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        getUserFriendlyErrorMessage(
          requestError,
          `Unable to ${status === 'accepted' ? 'accept' : 'decline'} this order.`,
        );
      setActionErrors((current) => ({ ...current, [order._id]: message }));
      setStockErrors((current) => ({
        ...current,
        [order._id]: requestError.response?.status === 409,
      }));

      if (
        requestError.response?.status === 409 &&
        /no longer pending|only pending orders can be updated/i.test(message)
      ) {
        await refreshOrders();
      }
    } finally {
      setUpdatingOrderId('');
    }
  };

  const isEmpty = orders.length === 0;
  const emptyLabel =
    statusFilter === 'all'
      ? 'No order requests yet.'
      : `No ${statusFilter} requests right now.`;

  return (
    <section className="page-card farmer-requests-page">
      <header className="farmer-requests-heading">
        <div>
          <p className="eyebrow">Farmer workspace</p>
          <h1>Order requests</h1>
        </div>
        <button
          type="button"
          className="farmer-requests-refresh"
          onClick={refreshOrders}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <div className="farmer-requests-filters" role="tablist" aria-label="Filter requests">
        {REQUEST_FILTERS.map((filter) => (
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === filter.value}
            className={statusFilter === filter.value ? 'active' : ''}
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="form-error farmer-requests-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => retryAction === 'loadMore' ? handleLoadMore() : refreshOrders()}
            disabled={isRefreshing || isLoadingMore}
          >
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <RequestSkeleton />
      ) : isEmpty && !error ? (
        <p className="farmer-requests-empty">{emptyLabel}</p>
      ) : (
        <div className="farmer-requests-list">
          {orders.map((order) => (
            <RequestCard
              key={order._id}
              order={order}
              actionError={actionErrors[order._id]}
              updateStock={stockErrors[order._id]}
              accepting={updatingOrderId === order._id && confirmationOrderId === order._id}
              declining={updatingOrderId === order._id && declineOrderId === order._id}
              confirmationOpen={confirmationOrderId === order._id}
              declineFormOpen={declineOrderId === order._id}
              onBeginAccept={() => {
                setActionErrors((current) => ({ ...current, [order._id]: '' }));
                setConfirmationOrderId(order._id);
                setDeclineOrderId('');
              }}
              onConfirmAccept={() => handleOrderStatus(order, 'accepted')}
              onBeginDecline={() => {
                setActionErrors((current) => ({ ...current, [order._id]: '' }));
                setDeclineOrderId(order._id);
                setConfirmationOrderId('');
              }}
              onDecline={(reason) => handleOrderStatus(order, 'declined', reason)}
              onCancelAction={() => {
                setConfirmationOrderId('');
                setDeclineOrderId('');
              }}
            />
          ))}
        </div>
      )}

      {hasMore && !isLoading && (
        <button
          type="button"
          className="farmer-requests-load-more"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </section>
  );
}

export default FarmerRequests;
