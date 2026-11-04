import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

const avatarStyles = {
  male: { symbol: '👨‍🌾', color: '#d9f0ff' },
  female: { symbol: '👩‍🌾', color: '#fce7f3' },
  neutral: { symbol: '🌾', color: '#e7f6e9' },
  farm: { symbol: '🚜', color: '#fff0d5' },
};

const produceFilters = [
  { id: 'All', label: 'All', categories: null },
  { id: 'Fruits / Vegetables', label: 'Fruits / Vegetables', categories: ['Fruits', 'Vegetables'] },
  { id: 'Tubers', label: 'Tubers', categories: ['Tubers'] },
  { id: 'Grains', label: 'Grains', categories: ['Grains'] },
  { id: 'Livestock', label: 'Livestock', categories: ['Livestock'] },
];

const produceStatusLabels = {
  available: 'Available',
  sold_out: 'Sold out',
  coming_soon: 'Coming soon',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const permittedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function Dashboard() {
  const [produce, setProduce] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [imageEditItem, setImageEditItem] = useState(null);
  const [replacementImage, setReplacementImage] = useState(null);
  const [replacementPreview, setReplacementPreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageSavingId, setImageSavingId] = useState(null);
  const imageInputRef = useRef(null);
  const imageSubmissionLockRef = useRef(false);
  const farmerName = localStorage.getItem('farmerName') || 'Farmer';
  const farmerAvatar = localStorage.getItem('farmerAvatar') || 'neutral';
  const currentAvatar = avatarStyles[farmerAvatar] || avatarStyles.neutral;

  useEffect(() => {
    const fetchMyProduce = async () => {
      setError('');
      try {
        const response = await api.get('/produce/mine');
        setProduce(response.data);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, 'Unable to load your produce.'));
      }
    };
    fetchMyProduce();
  }, []);

  useEffect(() => {
    if (!replacementImage) {
      setReplacementPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(replacementImage);
    setReplacementPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [replacementImage]);

  const startEditing = (item) => {
    setError('');
    setMessage('');
    setEditingId(item._id);
    setDraft({ name: item.name, category: item.category, status: item.status || 'available', quantity: item.quantity, unit: item.unit || 'unit', price: item.price, location: item.location });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleDraftChange = (event) => {
    setDraft({ ...draft, [event.target.name]: event.target.value });
  };

  const saveChanges = async (id) => {
    setError('');
    setMessage('');
    setSavingId(id);
    try {
      const response = await api.put(`/produce/${id}`, { ...draft, quantity: Number(draft.quantity), price: Number(draft.price) });
      setProduce((current) => current.map((item) => (item._id === id ? response.data : item)));
      cancelEditing();
      setMessage('Listing updated successfully.');
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Unable to update listing.'));
    } finally {
      setSavingId(null);
    }
  };

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this produce listing? This cannot be undone.')) return;
    setError('');
    setMessage('');
    setDeletingId(id);
    try {
      await api.delete(`/produce/${id}`);
      setProduce((current) => current.filter((item) => item._id !== id));
      setMessage('Listing deleted.');
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Unable to delete listing.'));
    } finally {
      setDeletingId(null);
    }
  };

  const openImageEditor = (item) => {
    setImageEditItem(item);
    setReplacementImage(null);
    setImageError('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const cancelImageEdit = () => {
    setImageEditItem(null);
    setReplacementImage(null);
    setImageError('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleReplacementImageChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setImageError('');
    if (!permittedImageTypes.includes(selectedFile.type)) {
      setImageError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setImageError('Choose an image that is 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setReplacementImage(selectedFile);
  };

  const saveReplacementImage = async () => {
    if (!imageEditItem || !replacementImage || imageSubmissionLockRef.current) return;

    imageSubmissionLockRef.current = true;
    setImageSavingId(imageEditItem._id);
    setImageError('');
    setError('');
    setMessage('');

    try {
      const imageData = new FormData();
      imageData.append('image', replacementImage);
      const response = await api.put(`/produce/${imageEditItem._id}`, imageData);
      setProduce((current) => current.map((item) => (
        item._id === imageEditItem._id ? response.data : item
      )));
      setMessage('Produce image updated successfully.');
      cancelImageEdit();
    } catch (err) {
      setImageError(getUserFriendlyErrorMessage(err, 'Unable to update the produce image.'));
    } finally {
      imageSubmissionLockRef.current = false;
      setImageSavingId(null);
    }
  };

  const quantityByUnit = produce.reduce((totals, item) => {
    const unit = (item.unit || 'unit').trim().toLowerCase();
    totals.set(unit, (totals.get(unit) || 0) + Number(item.quantity));
    return totals;
  }, new Map());
  const quantitySummary = Array.from(quantityByUnit, ([unit, quantity]) => `${quantity} ${unit}`).join(' · ');
  const estimatedValue = produce.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0);
  const filteredProduce = produce.filter((item) => {
    const selectedFilter = produceFilters.find((filter) => filter.id === categoryFilter);
    return !selectedFilter?.categories || selectedFilter.categories.includes(item.category);
  });

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div className="dashboard-user-summary">
          <div className="dashboard-avatar" style={{ backgroundColor: currentAvatar.color }}>
            <span>{currentAvatar.symbol}</span>
          </div>
          <div>
            <p className="eyebrow">Farmer workspace</p>
            <h1>Welcome, {farmerName}</h1>
            <p className="dashboard-subtitle">Keep your listings fresh and ready for buyers.</p>
          </div>
        </div>
        <Link className="primary-button dashboard-add" to="/sell">+ Add produce</Link>
      </div>
      <div className="dashboard-stats">
        <div className="stat-card"><span>Total listings</span><strong>{produce.length}</strong></div>
        <div className="stat-card"><span>Total quantity</span><strong className="stat-quantity-total">{quantitySummary || '0'}</strong></div>
        <div className="stat-card"><span>Estimated value</span><strong>₵{estimatedValue.toFixed(2)}</strong></div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {message && <div className="form-success">{message}</div>}
      <div className="dashboard-listings">
        <div className="dashboard-category-tabs" role="group" aria-label="Filter produce by category">
          {produceFilters.map((filter) => {
            const count = filter.categories
              ? produce.filter((item) => filter.categories.includes(item.category)).length
              : produce.length;

            return (
              <button
                key={filter.id}
                type="button"
                className={categoryFilter === filter.id ? 'tab active' : 'tab'}
                aria-pressed={categoryFilter === filter.id}
                onClick={() => setCategoryFilter(filter.id)}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="listings-heading"><h2>Your produce</h2><span>{filteredProduce.length} {filteredProduce.length === 1 ? 'item' : 'items'}</span></div>
        {produce.length === 0 ? (
          <p className="empty-state">No produce listings yet. Add one from Sell Produce.</p>
        ) : filteredProduce.length === 0 ? (
          <p className="empty-state">No {categoryFilter.toLowerCase()} listings yet.</p>
        ) : (
          filteredProduce.map((item) => editingId === item._id ? (
            <form key={item._id} className="produce-row produce-row-edit" onSubmit={(event) => { event.preventDefault(); saveChanges(item._id); }}>
              <div className="produce-row-title"><div className="produce-icon">✿</div><div><input className="inline-name" name="name" value={draft.name} onChange={handleDraftChange} maxLength={30} required /><span className="stock-badge">Editing</span></div></div>
              <label>Category<select name="category" value={draft.category} onChange={handleDraftChange}><option>Fruits</option><option>Vegetables</option><option>Grains</option><option>Tubers</option><option>Livestock</option></select></label>
              <label>Availability<select name="status" value={draft.status} onChange={handleDraftChange}><option value="available">Available</option><option value="sold_out">Sold out</option><option value="coming_soon">Coming soon</option></select></label>
              <label>Quantity<input name="quantity" type="number" min="1" value={draft.quantity} onChange={handleDraftChange} required /></label>
              <label>Unit<input name="unit" value={draft.unit} onChange={handleDraftChange} maxLength={30} required /></label>
              <label>Price (₵)<input name="price" type="number" min="0" step="0.01" value={draft.price} onChange={handleDraftChange} required /></label>
              <label>Location<input name="location" value={draft.location} onChange={handleDraftChange} maxLength={40} required /></label>
              <div className="row-actions"><button type="button" className="secondary-button compact-button" onClick={cancelEditing}>Undo</button><button type="submit" className="primary-button compact-button" disabled={savingId === item._id}>{savingId === item._id ? 'Saving...' : 'Save changes'}</button></div>
            </form>
          ) : (
            <article key={item._id} className="produce-row">
              <div className="produce-row-title"><div className="produce-icon marketplace-produce-image"><span className="marketplace-image-fallback" aria-hidden="true">✿</span>{item.imageUrl && <img src={item.imageUrl} alt={item.name} loading="lazy" onError={(event) => event.currentTarget.remove()} />}</div><div><h3>{item.name}</h3><p>{item.category} · {item.location} · {item.quantity} {item.unit || 'unit'}</p></div><div className="produce-row-badges"><span className={`produce-status-badge ${item.status || 'available'}`}>{produceStatusLabels[item.status] || produceStatusLabels.available}</span><span className={`stock-badge ${Number(item.quantity) < 50 ? 'low-stock' : ''}`}>{Number(item.quantity) < 50 ? 'Low stock' : 'In stock'}</span></div></div>
              <strong className="row-price">₵{Number(item.price).toFixed(2)} / {item.unit || 'unit'}</strong>
              <div className="row-actions"><button type="button" className="icon-button" onClick={() => startEditing(item)} aria-label={`Edit ${item.name}`}>Edit</button><button type="button" className="icon-button" onClick={() => openImageEditor(item)} aria-label={`Change image for ${item.name}`}>Edit image</button><button type="button" className="icon-button delete-button" onClick={() => deleteListing(item._id)} disabled={deletingId === item._id} aria-label={`Delete ${item.name}`}>{deletingId === item._id ? '...' : 'Delete'}</button></div>
            </article>
          ))
        )}
      </div>
      {imageEditItem && (
        <div className="image-edit-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !imageSavingId) cancelImageEdit();
        }}>
          <section className="image-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="image-edit-title">
            <h2 id="image-edit-title">Change produce image</h2>
            <p>{imageEditItem.name}</p>
            <div className="image-edit-preview">
              {replacementImage && replacementPreview ? (
                <img src={replacementPreview} alt={`Preview of ${replacementImage.name}`} />
              ) : imageEditItem.imageUrl ? (
                <img src={imageEditItem.imageUrl} alt={imageEditItem.name} />
              ) : (
                <span className="marketplace-image-fallback" aria-hidden="true">✿</span>
              )}
            </div>
            <label className="image-edit-file-label" htmlFor="replacement-image">Select a JPG, PNG, or WebP image</label>
            <input
              ref={imageInputRef}
              id="replacement-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReplacementImageChange}
            />
            <p className="produce-image-help">Maximum size: 5 MB.</p>
            {imageError && <div className="form-error" role="alert">{imageError}</div>}
            <div className="image-edit-actions">
              <button type="button" className="secondary-button compact-button" onClick={cancelImageEdit} disabled={Boolean(imageSavingId)}>Cancel</button>
              <button type="button" className="primary-button compact-button" onClick={saveReplacementImage} disabled={!replacementImage || Boolean(imageSavingId)}>
                {imageSavingId ? 'Uploading image...' : 'Save image'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Dashboard;
