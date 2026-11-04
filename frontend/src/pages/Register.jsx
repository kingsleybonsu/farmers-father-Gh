import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';
import AvatarPicker from '../components/AvatarPicker.jsx';

const MIN_PASSWORD_ERROR = 'Password must be at least 8 characters long.';

function Register({ setIsAuthenticated }) {
  const [formData, setFormData] = useState({
    name: '',
    farmName: '',
    phone: '',
    email: '',
    password: '',
    avatarStyle: 'neutral',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'password' && e.target.value.length >= 8) {
      setError((current) => current === MIN_PASSWORD_ERROR ? '' : current);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    if (formData.password.length < 8) {
      setError(MIN_PASSWORD_ERROR);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/register', {
        ...formData,
        email: formData.email.trim(),
      });
      localStorage.setItem('farmerToken', response.data.token);
      localStorage.setItem('farmerName', response.data.farmer.name);
      localStorage.setItem('farmerAvatar', response.data.farmer.avatarStyle || formData.avatarStyle);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-card">
      <h1>Become a Farmer</h1>
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
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}

export default Register;
