const UNITS_BY_CATEGORY = {
  Fruits: ["kg", "basket", "crate", "bag", "bunch", "piece"],
  Vegetables: ["kg", "bag", "crate", "basket", "bowl", "bunch", "piece"],
  Grains: ["kg", "bag", "bowl", "tonne"],
  Tubers: ["tuber", "kg", "bag", "heap"],
  Livestock: ["animal", "bird", "tray", "crate", "kg"],
};

const isAllowedUnit = (category, unit) =>
  Array.isArray(UNITS_BY_CATEGORY[category]) &&
  UNITS_BY_CATEGORY[category].includes(unit);

module.exports = { UNITS_BY_CATEGORY, isAllowedUnit };
