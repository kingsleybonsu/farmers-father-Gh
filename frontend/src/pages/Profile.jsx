import { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';
import AvatarPicker from '../components/AvatarPicker.jsx';

const emptyProfile = {
  name: '',
  farmName: '',
  phone: '',
  location: '',
  avatarStyle: 'neutral',
};

function Profile({ onProfileUpdated }) {
  const [formData, setFormData] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setError('');
      try {
        const response = await api.get('/auth/me');
        const farmer = response.data.farmer;
        setFormData({
          name: farmer.name || '',
          farmName: farmer.farmName || '',
          phone: farmer.phone || '',
          location: farmer.location || '',
          avatarStyle: farmer.avatarStyle || 'neutral',
        });
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, 'Unable to load your profile.'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const response = await api.put('/auth/me', formData);
      const farmer = response.data.farmer;
      const avatarStyle = farmer.avatarStyle || 'neutral';
      localStorage.setItem('farmerName', farmer.name);
      localStorage.setItem('farmerAvatar', avatarStyle);
      setFormData({
        name: farmer.name || '',
        farmName: farmer.farmName || '',
        phone: farmer.phone || '',
        location: farmer.location || '',
        avatarStyle,
      });
      onProfileUpdated?.(farmer.name);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Unable to update your profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Farmer workspace</p>
          <h1>Your profile</h1>
          <p className="dashboard-subtitle">Manage your farmer and farm details.</p>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {message && <div className="form-success" role="status">{message}</div>}
      {loading ? (
        <p className="empty-state">Loading your profile...</p>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" value={formData.name} onChange={handleChange} maxLength={60} required />
          </label>
          <label>
            Farm name
            <input name="farmName" value={formData.farmName} onChange={handleChange} maxLength={60} required />
          </label>
          <label>
            Phone
            <input name="phone" value={formData.phone} onChange={handleChange} required />
          </label>
          <label>
            Location
            <input name="location" value={formData.location} onChange={handleChange} maxLength={60} />
          </label>
          <AvatarPicker
            value={formData.avatarStyle}
            onChange={(avatarStyle) => setFormData((current) => ({ ...current, avatarStyle }))}
          />
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving profile...' : 'Save profile'}
          </button>
        </form>
      )}
    </section>
  );
}

export default Profile;