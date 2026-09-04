'use client'

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
  // PDF Viewer: 100% responsive width, cleanly contained
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

  // Image Viewer: 100% fitted to page width by default, natural web behavior
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden bg-slate-950/5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-center p-2 sm:p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={title}
        loading="eager"
        decoding="async"
        className="w-full max-w-full h-auto max-h-[75vh] object-contain rounded-xl shadow-sm border border-slate-200/60 block mx-auto"
        style={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
        }}
      />
    </div>
  )
}
