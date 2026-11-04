import { NavLink } from 'react-router-dom';
import logoIcon from '../assets/images/logo-icon-white.png';

const navigationItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'My produce', path: '/produce', icon: '✿' },
  { label: 'Profile', path: '/profile', icon: '♙' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
];

function FarmerNavigation() {
  return (
    <>
      <aside className="farmer-sidebar" aria-label="Farmer dashboard navigation">
        <div className="farmer-sidebar-brand">
          <img src={logoIcon} alt="" className="brand-logo" />
          <span>Farmers Father</span>
        </div>
        <nav className="farmer-sidebar-links">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'farmer-nav-link active' : 'farmer-nav-link'}
            >
              <span className="farmer-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <nav className="farmer-bottom-nav" aria-label="Mobile farmer dashboard navigation">
        {navigationItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'farmer-bottom-link active' : 'farmer-bottom-link'}
          >
            <span className="farmer-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default FarmerNavigation;