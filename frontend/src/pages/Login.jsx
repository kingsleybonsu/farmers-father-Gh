import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api, { clearStoredSession } from '../api/axios.js';
import buyerApi, {
  clearStoredBuyerSession,
  storeBuyerSession,
} from '../api/buyerApi.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

function Login({
  setIsAuthenticated,
  onBuyerAuthenticated,
  sessionExpired,
  buyerSessionExpired,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role') === 'buyer' ? 'buyer' : 'farmer';
  const from = location.state?.from?.pathname || '/dashboard';
  const showSessionExpired = role === 'buyer'
    ? buyerSessionExpired || (
      location.state?.sessionExpired &&
      location.state?.expiredRole === 'buyer'
    )
    : sessionExpired || (
      location.state?.sessionExpired &&
      location.state?.expiredRole !== 'buyer'
    );

  const selectRole = (nextRole) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('role', nextRole);
    setSearchParams(nextParams, { replace: true });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      if (role === 'buyer') {
        const response = await buyerApi.post('/buyers/login', {
          email: email.trim(),
          password,
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

      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });
      clearStoredBuyerSession();
      localStorage.setItem('farmerToken', response.data.token);
      localStorage.setItem('farmerName', response.data.farmer.name);
      localStorage.setItem('farmerAvatar', response.data.farmer.avatarStyle || 'neutral');
      setIsAuthenticated(true);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-card">
      <h1>Login</h1>
      {showSessionExpired && (
        <div className="form-error" role="alert">Your session expired, please log in again</div>
      )}
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
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            autoComplete="email"
            disabled={isSubmitting}
            required
          />
        </label>
        <label>
          Password
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="current-password"
              disabled={isSubmitting}
              required
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
        </label>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="auth-switch">
        Don't have an account? <Link to={`/register?role=${role}`}>Create one</Link>
      </p>
    </section>
  );
}

export default Login;
