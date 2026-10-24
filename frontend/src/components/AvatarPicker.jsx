const avatarOptions = [
  { id: 'male', label: 'Male', symbol: '👨‍🌾', color: '#d9f0ff' },
  { id: 'female', label: 'Female', symbol: '👩‍🌾', color: '#fce7f3' },
  { id: 'neutral', label: 'Neutral', symbol: '🌾', color: '#e7f6e9' },
  { id: 'farm', label: 'Farm', symbol: '🚜', color: '#fff0d5' },
];

function AvatarPicker({ value, onChange }) {
  return (
    <div className="avatar-selector-block">
      <span className="avatar-selector-label">Choose avatar style</span>
      <div className="avatar-selector-grid">
        {avatarOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`avatar-option ${value === option.id ? 'active' : ''}`}
            onClick={() => onChange(option.id)}
            aria-label={`Choose ${option.label} avatar`}
            aria-pressed={value === option.id}
            style={{ backgroundColor: option.color }}
          >
            <span>{option.symbol}</span>
            <small>{option.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AvatarPicker;