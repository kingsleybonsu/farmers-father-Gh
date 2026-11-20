import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import buyerApi from '../api/buyerApi.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

const ORDER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABELS = {
  pending: 'Waiting for the farmer',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const STATUS_HELPERS = {
  pending: 'The farmer will accept or decline your request.',
  accepted:
    'The farmer accepted your order. Pay when you pick up or receive your produce, and never before you see it.',
  cancelled: 'You cancelled this order.',
};

const fetchBuyerOrdersPage = async (page, status, signal) => {
  const params = { page };
  if (status !== 'all') params.status = status;
  const response = await buyerApi.get('/orders/buyer', { params, signal });
  return response.data;
};

const formatMoney = (value) => `₵${Number(value || 0).toFixed(2)}`;

const formatPlacedDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getFarmerId = (order) => {
  const farmer = order.farmer;
  if (farmer && typeof farmer === 'object') {
    return farmer._id || farmer.id || '';
  }
  return order.farmerId || farmer || '';
};

function OrderCard({
  order,
  cancelError,
  confirmationOpen,
  cancelling,
  onBeginCancel,
  onConfirmCancel,
  onKeepOrder,
}) {
  const status = order.status || 'pending';
  const farmerId = getFarmerId(order);
  const farmName = order.farmName || 'Farm';
  const helper =
    status === 'declined'
      ? order.declineReason
        ? `Reason: ${order.declineReason}`
        : ''
      : STATUS_HELPERS[status] || '';

  return (
    <article className="buyer-order-card">
      <header className="buyer-order-header">
        <h3>
          {farmerId ? (
            <Link to={`/farmers/${farmerId}`}>{farmName}</Link>
          ) : (
            farmName
          )}
        </h3>
        <span className={`buyer-order-status status-${status}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </header>

      <ul className="buyer-order-items">
        {(order.items || []).map((item, index) => (
          <li
            key={`${item.produce || item._id || item.name || 'item'}-${index}`}
          >
            <span className="buyer-order-item-name">
              {item.name} · {item.quantity} {item.unit}
            </span>
            <span>{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="buyer-order-total">
        <strong>Order total</strong>
        <strong>{formatMoney(order.total)}</strong>
      </div>

      <dl className="buyer-order-details">
        <div>
          <dt>Fulfilment</dt>
          <dd>
            {order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}
          </dd>
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

      {helper && <p className={`buyer-order-helper status-${status}`}>{helper}</p>}

      {cancelError && (
        <div className="form-error buyer-order-action-error" role="alert">
          {cancelError}
        </div>
      )}

      {status === 'pending' &&
        (confirmationOpen ? (
          <div className="buyer-order-cancel-confirmation">
            <span>Cancel this order?</span>
            <div>
              <button
                type="button"
                className="buyer-order-cancel-yes"
                onClick={onConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Yes, cancel'}
              </button>
              <button
                type="button"
                className="buyer-order-cancel-no"
                onClick={onKeepOrder}
                disabled={cancelling}
              >
                No, keep it
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="buyer-order-cancel-button"
            onClick={onBeginCancel}
            disabled={cancelling}
          >
            Cancel order
          </button>
        ))}
    </article>
  );
}

function OrderLoadingSkeleton() {
  return (
    <div className="buyer-orders-skeleton-list" aria-label="Loading orders">
      {[0, 1, 2].map((item) => (
        <div className="buyer-orders-skeleton-card" key={item}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function MyOrders() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState('refresh');
  const [confirmationOrderId, setConfirmationOrderId] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState('');
  const [cancelErrors, setCancelErrors] = useState({});
  const [cancelNotice, setCancelNotice] = useState('');
  const currentFilterRef = useRef(statusFilter);
  const skipFilterLoadRef = useRef(false);
  const refreshOrdersRef = useRef(null);
  currentFilterRef.current = statusFilter;

  const groups = useMemo(() => {
    const grouped = new Map();
    orders.forEach((order) => {
      const groupId = order.checkoutGroupId || `order:${order._id}`;
      const group = grouped.get(groupId) || {
        id: groupId,
        createdAt: order.createdAt,
        orders: [],
      };
      group.orders.push(order);
      if (new Date(order.createdAt) > new Date(group.createdAt)) {
        group.createdAt = order.createdAt;
      }
      grouped.set(groupId, group);
    });
    return [...grouped.values()].sort(
      (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
    );
  }, [orders]);

  useEffect(() => {
    if (skipFilterLoadRef.current) {
      skipFilterLoadRef.current = false;
      return undefined;
    }

    const controller = new AbortController();
    setOrders([]);
    setPage(1);
    setHasMore(false);
    setError('');
    setCancelNotice('');
    setCancelErrors({});
    setIsLoading(true);
    setRetryAction('refresh');

    fetchBuyerOrdersPage(1, statusFilter, controller.signal)
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
              'Unable to load your orders.',
            ),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [statusFilter]);

  const refreshOrders = useCallback(
    async ({ statusOverride, searchOrderId } = {}) => {
      const filter = statusOverride || statusFilter;
      const targetPageCount = searchOrderId ? Number.POSITIVE_INFINITY : page;
      const controller = new AbortController();
      const loadedOrders = [];
      let nextPage = 1;
      let nextHasMore = false;
      let foundOrder = false;

      setError('');
      setRetryAction('refresh');
      setIsRefreshing(true);

      try {
        do {
          const data = await fetchBuyerOrdersPage(
            nextPage,
            filter,
            controller.signal,
          );
          const pageOrders = Array.isArray(data.orders) ? data.orders : [];
          loadedOrders.push(...pageOrders);
          nextHasMore = Boolean(data.hasMore);
          foundOrder = Boolean(
            searchOrderId &&
              pageOrders.some((order) => order._id === searchOrderId),
          );
          if (
            nextPage >= targetPageCount ||
            !nextHasMore ||
            (searchOrderId && foundOrder)
          ) {
            break;
          }
          nextPage += 1;
        } while (true);

        if (currentFilterRef.current !== statusFilter) return;
        if (statusOverride && statusOverride !== statusFilter) {
          skipFilterLoadRef.current = true;
          setStatusFilter(statusOverride);
        }
        setOrders(loadedOrders);
        setPage(nextPage);
        setHasMore(nextHasMore);
      } catch (requestError) {
        setRetryAction('refresh');
        setError(
          getUserFriendlyErrorMessage(
            requestError,
            'Unable to load your orders.',
          ),
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [page, statusFilter],
  );

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
      const data = await fetchBuyerOrdersPage(nextPage, filterAtRequest);
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
          'Unable to load more orders.',
        ),
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCancelOrder = async (order) => {
    if (cancellingOrderId) return;
    setCancellingOrderId(order._id);
    setCancelErrors((current) => ({ ...current, [order._id]: '' }));
    try {
      await buyerApi.put(`/orders/${order._id}/cancel`);
      setOrders((current) =>
        current.map((item) =>
          item._id === order._id ? { ...item, status: 'cancelled' } : item,
        ),
      );
      setConfirmationOrderId('');
      setCancelNotice('');
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        getUserFriendlyErrorMessage(
          requestError,
          'Unable to cancel this order.',
        );
      setConfirmationOrderId('');

      if (requestError.response?.status === 409) {
        setCancelErrors((current) => ({ ...current, [order._id]: '' }));
        setCancelNotice(message);
        await refreshOrders({
          statusOverride: 'all',
          searchOrderId: order._id,
        });
      } else {
        setCancelErrors((current) => ({ ...current, [order._id]: message }));
      }
    } finally {
      setCancellingOrderId('');
    }
  };

  const handleFilterChange = (nextFilter) => {
    if (nextFilter === statusFilter) return;
    setStatusFilter(nextFilter);
  };

  return (
    <section className="page-card my-orders-page">
      <header className="my-orders-heading">
        <div>
          <p className="eyebrow">Buyer account</p>
          <h1>My orders</h1>
        </div>
        <button
          type="button"
          className="my-orders-refresh"
          onClick={() => refreshOrders()}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <div className="my-orders-filters" role="tablist" aria-label="Filter orders">
        {ORDER_FILTERS.map((filter) => (
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === filter.value}
            className={statusFilter === filter.value ? 'active' : ''}
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {cancelNotice && (
        <div className="my-orders-notice" role="status">{cancelNotice}</div>
      )}

      {error && (
        <div className="my-orders-error form-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="my-orders-try-again"
            onClick={() =>
              retryAction === 'loadMore'
                ? handleLoadMore()
                : refreshOrders()
            }
            disabled={isRefreshing || isLoadingMore}
          >
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <OrderLoadingSkeleton />
      ) : orders.length === 0 && !error ? (
        statusFilter === 'all' ? (
          <div className="my-orders-empty">
            <p>You haven't placed any orders yet</p>
            <Link className="primary-button" to="/">Browse produce</Link>
          </div>
        ) : (
          <p className="my-orders-filter-empty">No {statusFilter} orders</p>
        )
      ) : (
        <div className="my-orders-groups">
          {groups.map((group) => (
            <section className="my-orders-group" key={group.id}>
              <h2>Placed on {formatPlacedDate(group.createdAt)}</h2>
              <div className="my-orders-group-cards">
                {group.orders.map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    cancelError={cancelErrors[order._id]}
                    confirmationOpen={confirmationOrderId === order._id}
                    cancelling={Boolean(cancellingOrderId)}
                    onBeginCancel={() => {
                      setCancelErrors((current) => ({
                        ...current,
                        [order._id]: '',
                      }));
                      setConfirmationOrderId(order._id);
                    }}
                    onConfirmCancel={() => handleCancelOrder(order)}
                    onKeepOrder={() => setConfirmationOrderId('')}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {hasMore && !isLoading && (
        <button
          type="button"
          className="my-orders-load-more"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </section>
  );
}

export default MyOrders;
