'use client'

import { useEffect, useState } from 'react'

export function showToast(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vault-toast', { detail: message }))
  }
}

export default function ToastContainer() {
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined
    const handleToast = (e: Event) => {
      const msg = (e as CustomEvent).detail
      setToast(msg)
      clearTimeout(timer)
      timer = setTimeout(() => {
        setToast(null)
      }, 3000)
    }

    window.addEventListener('vault-toast', handleToast)
    return () => {
      window.removeEventListener('vault-toast', handleToast)
      clearTimeout(timer)
    }
  }, [])

  if (!toast) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 max-w-sm w-full">
      <div className="bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 text-xs sm:text-sm font-semibold flex items-center justify-center text-center mx-auto backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
        <span>{toast}</span>
      </div>
    </div>
  )
}
