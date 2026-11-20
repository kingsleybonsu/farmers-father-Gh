import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api, { clearStoredSession } from '../api/axios.js';
import buyerApi, {
  clearStoredBuyerSession,
  storeBuyerSession,
} from '../api/buyerApi.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';
import AvatarPicker from '../components/AvatarPicker.jsx';

const MIN_PASSWORD_ERROR = 'Password must be at least 8 characters long.';

function Register({ setIsAuthenticated, onBuyerAuthenticated }) {
  const [formData, setFormData] = useState({
    name: '',
    farmName: '',
    phone: '',
    email: '',
    password: '',
    avatarStyle: 'neutral',
  });
  const [buyerData, setBuyerData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role') === 'buyer' ? 'buyer' : 'farmer';

  const selectRole = (nextRole) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('role', nextRole);
    setSearchParams(nextParams, { replace: true });
    setError('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'password' && e.target.value.length >= 8) {
      setError((current) => current === MIN_PASSWORD_ERROR ? '' : current);
    }
  };

  const handleBuyerChange = (e) => {
    setBuyerData({ ...buyerData, [e.target.name]: e.target.value });
    if (e.target.name === 'password' && e.target.value.length >= 8) {
      setError((current) => current === MIN_PASSWORD_ERROR ? '' : current);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    if (role === 'buyer' && buyerData.password.length < 8) {
      setError(MIN_PASSWORD_ERROR);
      return;
    }
    if (role === 'farmer' && formData.password.length < 8) {
      setError(MIN_PASSWORD_ERROR);
      return;
    }

    setIsSubmitting(true);

    try {
      if (role === 'buyer') {
        const response = await buyerApi.post('/buyers/register', {
          ...buyerData,
          name: buyerData.name.trim(),
          email: buyerData.email.trim(),
        });
        clearStoredSession();
        setIsAuthenticated(false);
        if (!storeBuyerSession(response.data.token, response.data.buyer.name)) {
          setError('Unable to save your buyer session. Check your browser storage settings.');
          return;
        }
        onBuyerAuthenticated(response.data.buyer);
        navigate(location.state?.from || '/cart', { replace: true });
        return;
      }

      const response = await api.post('/auth/register', {
        ...formData,
        email: formData.email.trim(),
      });
      clearStoredBuyerSession();
      localStorage.setItem('farmerToken', response.data.token);
      localStorage.setItem('farmerName', response.data.farmer.name);
      localStorage.setItem('farmerAvatar', response.data.farmer.avatarStyle || formData.avatarStyle);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(
        role === 'buyer' && err.response?.data?.message
          ? err.response.data.message
          : getUserFriendlyErrorMessage(err, 'Registration failed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-card">
      <h1>{role === 'buyer' ? 'Create buyer account' : 'Become a Farmer'}</h1>
      <div className="auth-role-toggle" role="group" aria-label="Choose account type">
        <button
          type="button"
          className={role === 'buyer' ? 'active' : ''}
          aria-pressed={role === 'buyer'}
          onClick={() => selectRole('buyer')}
          disabled={isSubmitting}
        >
          I'm a buyer
        </button>
        <button
          type="button"
          className={role === 'farmer' ? 'active' : ''}
          aria-pressed={role === 'farmer'}
          onClick={() => selectRole('farmer')}
          disabled={isSubmitting}
        >
          I'm a farmer
        </button>
      </div>
      {role === 'buyer' ? (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              name="name"
              value={buyerData.name}
              onChange={handleBuyerChange}
              autoComplete="name"
              disabled={isSubmitting}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={buyerData.email}
              onChange={handleBuyerChange}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="email"
              disabled={isSubmitting}
              required
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              name="phone"
              value={buyerData.phone}
              onChange={handleBuyerChange}
              placeholder="e.g. 024 123 4567"
              pattern="\s*(\+233|0)(\s*\d){9}\s*"
              title="Enter a Ghana phone number like 024 123 4567"
              disabled={isSubmitting}
              required
            />
          </label>
          <label>
            Password
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={buyerData.password}
                onChange={handleBuyerChange}
                minLength={8}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                autoComplete="new-password"
                disabled={isSubmitting}
                required
                onInvalid={(event) => {
                  if (event.currentTarget.validity.tooShort) setError(MIN_PASSWORD_ERROR);
                }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isSubmitting}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <small>At least 8 characters</small>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </label>
          <label>
            Farm Name
            <input
              name="farmName"
              value={formData.farmName}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 024 123 4567"
              pattern="\s*(\+233|0)(\s*\d){9}\s*"
              title="Enter a Ghana phone number like 024 123 4567"
              disabled={isSubmitting}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="email"
              disabled={isSubmitting}
              required
            />
          </label>
          <AvatarPicker
            value={formData.avatarStyle}
            onChange={(avatarStyle) => setFormData((current) => ({ ...current, avatarStyle }))}
            disabled={isSubmitting}
          />
          <label>
            Password
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                autoComplete="new-password"
                disabled={isSubmitting}
                required
                onInvalid={(event) => {
                  if (event.currentTarget.validity.tooShort) setError(MIN_PASSWORD_ERROR);
                }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isSubmitting}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <small>At least 8 characters</small>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
      )}
      <p className="auth-switch">
        Already have an account? <Link to={`/login?role=${role}`}>Log in</Link>
      </p>
    </section>
  );
}

export default Register;
