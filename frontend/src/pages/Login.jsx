import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

function Login({ setIsAuthenticated, sessionExpired }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const showSessionExpired = sessionExpired || location.state?.sessionExpired;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('farmerToken', response.data.token);
      localStorage.setItem('farmerName', response.data.farmer.name);
      localStorage.setItem('farmerAvatar', response.data.farmer.avatarStyle || 'neutral');
      setIsAuthenticated(true);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <section className="page-card">
      <h1>Login</h1>
      {showSessionExpired && (
        <div className="form-error" role="alert">Your session expired, please log in again</div>
      )}
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="primary-button">Login</button>
      </form>
    </section>
  );
}

export default Login;
