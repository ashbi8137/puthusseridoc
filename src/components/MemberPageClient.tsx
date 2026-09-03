'use client'

import { useState } from 'react'
import UploadModal from './UploadModal'

interface MemberPageClientProps {
  memberSlug: string
  memberId: string
  existingDocs: any[]
}

export default function MemberPageClient({ memberSlug, memberId, existingDocs }: MemberPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold text-sm sm:text-base rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.99] cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Upload Document</span>
      </button>

      {isModalOpen && (
        <UploadModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          memberSlug={memberSlug}
          memberId={memberId}
          existingDocs={existingDocs}
        />
      )}
    </>
  )
}
