import { useState } from 'react';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

function Settings({ onLogout }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/auth/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setMessage(response.data.message || 'Password updated successfully.');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Unable to update your password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Farmer workspace</p>
          <h1>Settings</h1>
          <p className="dashboard-subtitle">Update your account password.</p>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {message && <div className="form-success" role="status">{message}</div>}
      <form className="form-grid settings-form" onSubmit={handleSubmit}>
        <label>
          Current password
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Updating password...' : 'Update password'}
        </button>
      </form>
      <div className="settings-logout">
        <button className="secondary-button" type="button" onClick={onLogout}>Log out</button>
      </div>
    </section>
  );
}

export default Settings;