import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CART_STORAGE_KEY = 'farmCart';
const CartContext = createContext(null);

const normalizeCartItem = (item) => {
  if (
    !item ||
    typeof item.produceId !== 'string' ||
    !item.produceId ||
    typeof item.name !== 'string' ||
    typeof item.unit !== 'string' ||
    typeof item.farmName !== 'string' ||
    typeof item.farmerId !== 'string'
  ) {
    return null;
  }

  const { unitPrice, quantity } = item;
  const maxQuantity = Math.floor(item.maxQuantity);
  if (
    typeof unitPrice !== 'number' ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0 ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    typeof item.maxQuantity !== 'number' ||
    !Number.isFinite(maxQuantity) ||
    maxQuantity < 1 ||
    quantity < 1 ||
    quantity > maxQuantity
  ) {
    return null;
  }

  return {
    produceId: item.produceId,
    name: item.name,
    unit: item.unit,
    unitPrice,
    quantity,
    maxQuantity,
    imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
    farmerId: item.farmerId,
    farmName: item.farmName,
  };
};

const loadCart = () => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return [];

    const parsedCart = JSON.parse(savedCart);
    return Array.isArray(parsedCart)
      ? parsedCart.map(normalizeCartItem).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

export function groupItemsByFarmer(items) {
  const groupedItems = new Map();
  items.forEach((item) => {
    const group = groupedItems.get(item.farmerId) || {
      farmerId: item.farmerId,
      farmName: item.farmName,
      items: [],
      subtotal: 0,
    };
    group.items.push(item);
    group.subtotal += item.unitPrice * item.quantity;
    groupedItems.set(item.farmerId, group);
  });
  return [...groupedItems.values()];
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Cart remains usable in memory when browser storage is unavailable.
    }
  }, [items]);

  const addItem = useCallback((item, qty) => {
    if (!item || typeof item !== 'object') return;

    const normalizedItem = normalizeCartItem({
      ...item,
      quantity: 1,
      maxQuantity: Math.floor(item.maxQuantity),
    });
    const requestedQuantity = Number(qty);
    if (
      !normalizedItem ||
      !Number.isFinite(requestedQuantity) ||
      normalizedItem.maxQuantity < 1
    ) {
      return;
    }

    const quantityToAdd = Math.max(1, Math.floor(requestedQuantity));
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (current) => current.produceId === normalizedItem.produceId,
      );
      if (!existingItem) {
        return [
          ...currentItems,
          {
            ...normalizedItem,
            quantity: Math.min(quantityToAdd, normalizedItem.maxQuantity),
          },
        ];
      }

      return currentItems.map((current) =>
        current.produceId === normalizedItem.produceId
          ? {
              ...normalizedItem,
              quantity: Math.min(
                existingItem.quantity + quantityToAdd,
                normalizedItem.maxQuantity,
              ),
            }
          : current,
      );
    });
  }, []);

  const updateQuantity = useCallback((produceId, qty) => {
    const requestedQuantity = Number(qty);
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.produceId !== produceId || !Number.isFinite(requestedQuantity)) {
          return item;
        }
        return {
          ...item,
          quantity: Math.min(
            item.maxQuantity,
            Math.max(1, Math.floor(requestedQuantity)),
          ),
        };
      }),
    );
  }, []);

  const removeItem = useCallback((produceId) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.produceId !== produceId),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );
  const cartValue = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
      groupItemsByFarmer,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, itemCount],
  );

  return (
    <CartContext.Provider value={cartValue}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider.');
  }
  return context;
}
