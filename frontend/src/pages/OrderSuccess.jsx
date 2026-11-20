import { Link, Navigate, useLocation } from 'react-router-dom';

function OrderSuccess() {
  const location = useLocation();
  const orderResponse = location.state?.orderResponse;
  const isDocumentReload =
    typeof performance !== 'undefined' &&
    performance.getEntriesByType('navigation')[0]?.type === 'reload';

  if (
    isDocumentReload ||
    !Array.isArray(orderResponse?.orders) ||
    !orderResponse.orders.length
  ) {
    return <Navigate to="/my-orders" replace />;
  }

  const combinedTotal = orderResponse.orders.reduce(
    (total, order) => total + Number(order.total || 0),
    0,
  );

  return (
    <section className="page-card order-success-page">
      <p className="eyebrow">Checkout complete</p>
      <h1>Order request sent</h1>
      <div className="order-success-list">
        {orderResponse.orders.map((order) => (
          <section className="order-success-card" key={order._id}>
            <h2>{order.farmName}</h2>
            <ul>
              {order.items.map((item, index) => (
                <li key={`${item.produce || item._id || item.name}-${index}`}>
                  <span>{item.name}</span>
                  <span>{item.quantity} {item.unit}</span>
                </li>
              ))}
            </ul>
            <p className="order-success-total">
              Confirmed total: ₵{Number(order.total).toFixed(2)}
            </p>
            <p className="order-success-status">
              Waiting for the farmer to respond
            </p>
          </section>
        ))}
      </div>
      <p className="order-success-combined-total">
        Combined total: ₵{combinedTotal.toFixed(2)}
      </p>
      <aside className="safety-notice" role="note">
        <span className="safety-notice-icon" aria-hidden="true">i</span>
        <p>Pay when you pick up or receive your produce. Never pay before you see it.</p>
      </aside>
      <div className="order-success-actions">
        <Link className="primary-button" to="/my-orders">View my orders</Link>
        <Link className="secondary-button" to="/">Continue shopping</Link>
      </div>
    </section>
  );
}

export default OrderSuccess;
