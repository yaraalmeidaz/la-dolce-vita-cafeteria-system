import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

const CART_STORAGE_KEY = "cafeteria_cart_v1";

function readStoredCartItems() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readStoredCartItems());

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  function addItem(product) {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function increase(id) {
    setItems(prev =>
      prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i)
    );
  }

  function decrease(id) {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      if (item.qty <= 1) {
        return prev.filter(i => i.id !== id);
      }
      return prev.map(i => (i.id === id ? { ...i, qty: i.qty - 1 } : i));
    });
  }

  function remove(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function clear() {
    setItems([]);
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, increase, decrease, remove, clear, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
