'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface DocumentViewerProps {
  url: string
  downloadUrl?: string
  title: string
  fileName: string
  fileType?: string
  isPdf: boolean
}

export default function DocumentViewer({
  url,
  downloadUrl,
  title,
  fileName,
  fileType,
  isPdf,
}: DocumentViewerProps) {
  // Zoom & Pan state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const lastTouchDistance = useRef<number | null>(null)
  const lastTapTime = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Zoom limits
  const MIN_SCALE = 1
  const MAX_SCALE = 3
  const STEP = 0.25

  const handleZoomIn = () => {
    setScale((prev) => Math.min(MAX_SCALE, Number((prev + STEP).toFixed(2))))
  }

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(MIN_SCALE, Number((prev - STEP).toFixed(2)))
      if (next === 1) {
        setPosition({ x: 0, y: 0 })
      }
      return next
    })
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Double tap to toggle zoom (1x <-> 2x)
  const handleDoubleTap = (e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      // Double tap detected
      if (scale > 1) {
        handleReset()
      } else {
        setScale(2)
      }
    }
    lastTapTime.current = now
  }

  // Touch handlers for panning & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true)
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      }
    } else if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      lastTouchDistance.current = dist
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      const newX = e.touches[0].clientX - dragStart.current.x
      const newY = e.touches[0].clientY - dragStart.current.y
      
      // Calculate boundaries based on scale
      const maxOffset = 150 * (scale - 1)
      setPosition({
        x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
      })
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = dist - lastTouchDistance.current
      if (Math.abs(delta) > 5) {
        const factor = delta > 0 ? 0.05 : -0.05
        setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((prev + factor).toFixed(2)))))
        lastTouchDistance.current = dist
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    lastTouchDistance.current = null
  }

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.current.x
      const newY = e.clientY - dragStart.current.y
      const maxOffset = 200 * (scale - 1)
      setPosition({
        x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // If PDF, render responsive PDF container with iPhone Safari fix
  if (isPdf) {
    return (
      <div className="space-y-3 w-full min-w-0 max-w-full">
        {/* PDF Control Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">
              PDF
            </span>
            <span className="text-slate-600 truncate text-[11px] sm:text-xs">
              {title}
            </span>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 text-[11px] font-bold shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all flex-shrink-0"
            title="Open in full browser viewer"
          >
            <span>Open in Fullscreen</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* PDF Iframe Container: Guaranteed iOS WebKit Fit */}
        <div 
          className="relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm"
          style={{ height: '72vh', minHeight: '480px' }}
        >
          <iframe
            src={`${url}#view=FitH`}
            title={title}
            className="w-full h-full border-0 block"
            style={{
              width: '1px',
              minWidth: '100%',
              maxWidth: '100%',
              height: '100%',
            }}
          />
        </div>
      </div>
    )
  }

  // Image Viewer (Cards, Licences, Certificates)
  return (
    <div className="space-y-3 w-full min-w-0 max-w-full">
      {/* Zoom Control Bar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-slate-100/90 backdrop-blur-md rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
        {/* Zoom In/Out Controls */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>

          {/* Current Zoom Indicator */}
          <span 
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold min-w-[58px] text-center select-none ${
              scale === 1 
                ? 'bg-white border-slate-200/80 text-slate-700' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}
          >
            {scale === 1 ? 'Fit' : `${Math.round(scale * 100)}%`}
          </span>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Reset / Fit to Width Button */}
        <div className="flex items-center gap-1.5">
          {scale !== 1 && (
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              title="Reset to Fit"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>
          )}

          {/* Open full image in new tab */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Open original image"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Main Image Card: 100% Fit Width by Default, Zero Horizontal Overflow on iOS Safari */}
      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleDoubleTap}
        className={`relative w-full min-w-0 max-w-full overflow-hidden bg-slate-950/5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-center select-none p-2 sm:p-4 min-h-[260px] sm:min-h-[360px] ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        style={{
          touchAction: scale > 1 ? 'none' : 'pan-y',
        }}
      >
        {/* Strictly constrained image container */}
        <div 
          className="w-full min-w-0 max-w-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={title}
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full max-w-full h-auto max-h-[75vh] object-contain rounded-xl shadow-sm border border-slate-200/60 block mx-auto pointer-events-none"
            style={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
            }}
          />
        </div>

        {/* Small hint on mobile */}
        {scale === 1 && (
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 pointer-events-none bg-black/50 backdrop-blur-md text-white/90 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
            <span>Double-tap to zoom</span>
          </div>
        )}
      </div>
    </div>
  )
}
