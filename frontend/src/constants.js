export const UNITS_BY_CATEGORY = {
  Fruits: ['kg', 'basket', 'crate', 'bag', 'bunch', 'piece'],
  Vegetables: ['kg', 'bag', 'crate', 'basket', 'bowl', 'bunch', 'piece'],
  Grains: ['kg', 'bag', 'bowl', 'tonne'],
  Tubers: ['tuber', 'kg', 'bag', 'heap'],
  Livestock: ['animal', 'bird', 'tray', 'crate', 'kg'],
};

export const getUnitsForCategory = (category) =>
  UNITS_BY_CATEGORY[category] || [];
