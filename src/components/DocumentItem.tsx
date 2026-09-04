'use client'

import Link from 'next/link'
import DocumentActions from './DocumentActions'

interface DocumentItemProps {
  document: {
    id: string
    document_name: string
    document_type: string
    file_path: string
    file_name: string
    file_type: string
    file_size: number
    created_at: string
    signed_url?: string | null
    [key: string]: any
  }
}

export default function DocumentItem({ document: doc }: DocumentItemProps) {
  const isImage = doc.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|bmp)$/i.test(doc.file_name)

  return (
    <div className="p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3 bg-white hover:bg-slate-50/70 transition-colors">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {/* Document Format Badge / Thumbnail (PDF or Image preview) */}
        {isImage ? (
          doc.signed_url ? (
            <Link href={`/view/${doc.id}`} prefetch={true} className="relative group block flex-shrink-0 active:scale-95 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.signed_url}
                alt={doc.document_name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:opacity-90 transition-opacity bg-slate-100"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-black/5" />
            </Link>
          ) : (
            <Link 
              href={`/view/${doc.id}`} 
              prefetch={true}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 border border-sky-200/80 flex flex-col items-center justify-center text-sky-600 shadow-2xs flex-shrink-0 group hover:scale-[1.03] active:scale-95 transition-transform"
            >
              <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-sky-700 leading-none mt-0.5">IMG</span>
            </Link>
          )
        ) : (
          <Link 
            href={`/view/${doc.id}`} 
            prefetch={true}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-50 via-red-50 to-rose-100 border border-rose-200/80 flex flex-col items-center justify-center text-rose-600 shadow-2xs flex-shrink-0 group hover:scale-[1.03] active:scale-95 transition-transform"
          >
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-rose-700 leading-none mt-0.5">PDF</span>
          </Link>
        )}

        {/* Document Name: Full priority, readable, wraps cleanly without unnecessary truncation */}
        <div className="min-w-0 flex-1 pr-1">
          <Link 
            href={`/view/${doc.id}`} 
            prefetch={true}
            className="font-bold text-xs sm:text-sm text-slate-900 hover:text-indigo-600 active:opacity-75 transition-colors line-clamp-2 leading-snug break-words"
            title={doc.document_name}
          >
            {doc.document_name}
          </Link>
        </div>
      </div>

      {/* Action Buttons: Compact, Clean, Easy to tap */}
      <DocumentActions document={doc} />
    </div>
  )
}
