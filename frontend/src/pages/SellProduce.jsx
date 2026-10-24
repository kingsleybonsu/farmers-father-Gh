import { useEffect, useRef, useState } from 'react';
import api from '../api/axios.js';
import { getUserFriendlyErrorMessage } from '../api/errorMessage.js';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const permittedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function SellProduce() {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fruits',
    status: 'available',
    quantity: '',
    unit: '',
    price: '',
    location: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const submissionLockRef = useRef(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    if (!permittedImageTypes.includes(selectedFile.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setError('Choose an image that is 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setImageFile(selectedFile);
  };

  const removeImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionLockRef.current) return;

    submissionLockRef.current = true;
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const listing = new FormData();
      listing.append('name', formData.name);
      listing.append('category', formData.category);
      listing.append('status', formData.status);
      listing.append('quantity', String(Number(formData.quantity)));
      listing.append('unit', formData.unit.trim());
      listing.append('price', String(Number(formData.price)));
      listing.append('location', formData.location);
      if (imageFile) listing.append('image', imageFile);

      await api.post('/produce', listing);
      setMessage('Produce listed successfully.');
      setFormData({ name: '', category: 'Fruits', status: 'available', quantity: '', unit: '', price: '', location: '' });
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Unable to create listing.'));
    } finally {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-card">
      <h1>Sell Produce</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Produce Name
          <input name="name" value={formData.name} onChange={handleChange} maxLength={15} required />
        </label>
        <label>
          Category
          <select name="category" value={formData.category} onChange={handleChange}>
            <option value="Fruits">Fruits</option>
            <option value="Vegetables">Vegetables</option>
            <option>Grains</option>
            <option>Tubers</option>
            <option>Livestock</option>
          </select>
        </label>
        <label>
          Availability
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="available">Available</option>
            <option value="sold_out">Sold out</option>
            <option value="coming_soon">Coming soon</option>
          </select>
        </label>
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Unit of measurement
          <input
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            placeholder="e.g. kg, basket, bag, crate, animal"
            maxLength={30}
            required
          />
        </label>
        <label>
          Price per unit
          <input
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Location
          <input name="location" value={formData.location} onChange={handleChange} maxLength={20} required />
        </label>
        <div className="produce-image-field">
          <label htmlFor="produce-image">Produce image <span>(optional)</span></label>
          <input
            ref={fileInputRef}
            id="produce-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            aria-describedby="produce-image-help"
          />
          <p id="produce-image-help" className="produce-image-help">JPG, PNG, or WebP. Maximum size: 5 MB.</p>
          {imageFile && imagePreview && (
            <div className="produce-image-preview">
              <img src={imagePreview} alt={`Preview of ${imageFile.name}`} />
              <div className="produce-image-actions">
                <span title={imageFile.name}>{imageFile.name}</span>
                <button type="button" className="secondary-button compact-button" onClick={removeImage}>
                  Remove image
                </button>
              </div>
            </div>
          )}
        </div>
        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? (imageFile ? 'Uploading image...' : 'Publishing...') : 'Publish Listing'}
        </button>
      </form>
    </section>
  );
}

export default SellProduce;
