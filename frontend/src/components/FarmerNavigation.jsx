import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import logoIcon from '../assets/images/logo-icon-white.png';
import api from '../api/axios.js';

const navigationItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Requests', path: '/requests', icon: '▤' },
  { label: 'My produce', path: '/produce', icon: '✿' },
  { label: 'Profile', path: '/profile', icon: '♙' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
  { label: 'Marketplace', path: '/', icon: '🛖' },
];

function FarmerNavigation() {
  const [pendingCount, setPendingCount] = useState(null);

  const loadPendingCount = useCallback(async () => {
    try {
      const response = await api.get('/orders/farmer', {
        params: { status: 'pending', page: 1 },
      });
      setPendingCount(
        Number.isFinite(response.data.totalOrders)
          ? response.data.totalOrders
          : null,
      );
    } catch {
      setPendingCount(null);
    }
  }, []);

  useEffect(() => {
    loadPendingCount();
    window.addEventListener('focus', loadPendingCount);
    window.addEventListener('farmer:orders-updated', loadPendingCount);
    return () => {
      window.removeEventListener('focus', loadPendingCount);
      window.removeEventListener('farmer:orders-updated', loadPendingCount);
    };
  }, [loadPendingCount]);

  const renderItem = (item, mobile = false) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) => {
        const baseClass = mobile ? 'farmer-bottom-link' : 'farmer-nav-link';
        return isActive ? `${baseClass} active` : baseClass;
      }}
    >
      <span className="farmer-nav-icon" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
      {item.path === '/requests' && pendingCount > 0 && (
        <span className="farmer-requests-nav-badge" aria-label={`${pendingCount} pending requests`}>
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </NavLink>
  );

  return (
    <>
      <aside className="farmer-sidebar" aria-label="Farmer dashboard navigation">
        <div className="farmer-sidebar-brand">
          <img src={logoIcon} alt="" className="brand-logo" />
          <span>Farmers Father</span>
        </div>
        <nav className="farmer-sidebar-links">
          {navigationItems.map((item) => renderItem(item))}
        </nav>
      </aside>
      <nav className="farmer-bottom-nav" aria-label="Mobile farmer dashboard navigation">
        {navigationItems.map((item) => renderItem(item, true))}
      </nav>
    </>
  );
}

export default FarmerNavigation;