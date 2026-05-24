import React, { createContext, useCallback, useContext, useState } from 'react'

const ToastCtx = createContext(null)
export const useToasts = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [...prev, { id, ...toast }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), toast.duration || 4500)
  }, [])
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-stack">
        {items.map(t => (
          <div key={t.id} className="toast">
            <div className="head">{t.title}</div>
            <div className="body">{t.body}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
