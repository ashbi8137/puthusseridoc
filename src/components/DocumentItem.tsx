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
  const isImage = doc.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file_name)

  return (
    <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/70 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Thumbnail Preview */}
        {isImage && doc.signed_url ? (
          <Link href={`/view/${doc.id}`} className="relative group block flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.signed_url}
              alt={doc.document_name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:opacity-90 transition-opacity bg-slate-100"
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-black/5" />
          </Link>
        ) : (
          <Link 
            href={`/view/${doc.id}`} 
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-50 via-red-50 to-rose-100 border border-rose-200/80 flex flex-col items-center justify-center text-rose-600 shadow-2xs flex-shrink-0 group hover:scale-[1.03] transition-transform"
          >
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 leading-none mt-0.5">PDF</span>
          </Link>
        )}

        {/* Title & Metadata */}
        <div className="min-w-0 flex-1">
          <Link 
            href={`/view/${doc.id}`} 
            className="font-bold text-xs sm:text-sm text-slate-900 truncate hover:text-indigo-600 transition-colors block"
          >
            {doc.document_name}
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span className="font-medium text-slate-500">{(doc.file_size / (1024 * 1024)).toFixed(1)} MB</span>
            <span>•</span>
            <span>{new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <DocumentActions document={doc} />
    </div>
  )
}
