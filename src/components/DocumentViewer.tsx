'use client'

import { useState, useRef } from 'react'

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
  title,
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

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Double tap to toggle zoom (1x <-> 2x) seamlessly without UI clutter
  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
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
      
      const maxOffset = 180 * (scale - 1)
      setPosition({
        x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
      })
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = dist - lastTouchDistance.current
      if (Math.abs(delta) > 5) {
        const factor = delta > 0 ? 0.05 : -0.05
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((scale + factor).toFixed(2))))
        setScale(next)
        if (next === 1) setPosition({ x: 0, y: 0 })
        lastTouchDistance.current = dist
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    lastTouchDistance.current = null
  }

  // Mouse drag handlers
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

  // PDF Viewer: Responsive with iOS Safari width containment
  if (isPdf) {
    return (
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
    )
  }

  // Image Viewer: 100% Fit Width by Default, Zero UI Clutter, Smooth Touch Gestures
  return (
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
        scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
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
    </div>
  )
}
