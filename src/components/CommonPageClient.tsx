'use client'

import { useState } from 'react'
import CommonUploadModal from './CommonUploadModal'

interface CommonPageClientProps {
  memberId: string
}

export default function CommonPageClient({ memberId }: CommonPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-slate-900 hover:bg-black text-white font-semibold text-xs sm:text-sm rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Upload Document</span>
      </button>

      {isModalOpen && (
        <CommonUploadModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          memberId={memberId}
        />
      )}
    </>
  )
}
