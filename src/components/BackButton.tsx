'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  fallbackHref?: string
  label?: string
}

export default function BackButton({ fallbackHref = '/home', label = 'Back to Home' }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // If user has browser history in this session, router.back() is 0ms INSTANT
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-all text-xs font-semibold bg-white/90 hover:bg-white active:scale-95 active:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/70 shadow-2xs cursor-pointer select-none"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
