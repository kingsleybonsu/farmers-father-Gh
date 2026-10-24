import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';
import AvatarPicker from '../components/AvatarPicker.jsx';

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
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/register', formData);
      localStorage.setItem('farmerToken', response.data.token);
      localStorage.setItem('farmerName', response.data.farmer.name);
      localStorage.setItem('farmerAvatar', response.data.farmer.avatarStyle || formData.avatarStyle);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Registration failed'));
    }
  };

  return (
    <section className="page-card">
      <h1>Become a Farmer</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" value={formData.name} onChange={handleChange} required />
        </label>
        <label>
          Farm Name
          <input name="farmName" value={formData.farmName} onChange={handleChange} required />
        </label>
        <label>
          Phone
          <input name="phone" value={formData.phone} onChange={handleChange} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>
        <AvatarPicker
          value={formData.avatarStyle}
          onChange={(avatarStyle) => setFormData((current) => ({ ...current, avatarStyle }))}
        />
        <label>
          Password
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
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
        <button type="submit" className="primary-button">Register</button>
      </form>
    </section>
  );
}

export default Register;
