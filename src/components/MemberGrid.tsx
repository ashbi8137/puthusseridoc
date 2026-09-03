'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { FamilyMember } from '@/lib/types'

interface MemberGridProps {
  familyMembers: (FamilyMember & {
    documents: any[]
    signed_avatar_url: string | null
  })[]
  themes: Record<string, {
    cardBg: string
    borderColor: string
    avatarBg: string
    accentColor: string
  }>
}

export default function MemberGrid({ familyMembers, themes }: MemberGridProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-2 gap-3">
      {familyMembers.map((member) => {
        const theme = themes[member.slug] || {
          cardBg: 'bg-gradient-to-br from-white via-slate-50 to-indigo-50/40',
          borderColor: 'border-slate-200/90 hover:border-slate-300',
          avatarBg: 'bg-slate-900 text-white',
          accentColor: 'text-slate-700',
        }

        const docCount = (member.documents as any[])?.length || 0
        const isClicked = activeSlug === member.slug

        return (
          <Link
            key={member.id}
            href={`/family/${member.slug}`}
            prefetch={true}
            onClick={() => setActiveSlug(member.slug)}
            className={`group ${theme.cardBg} rounded-2xl shadow-xs border p-3.5 sm:p-4 flex flex-col justify-between min-h-[125px] transition-all duration-150 cursor-pointer select-none ${
              isClicked
                ? 'ring-2 ring-indigo-500 scale-[0.97] bg-indigo-50/60 shadow-inner'
                : `hover:shadow-md hover:scale-[1.01] active:scale-[0.97] ${theme.borderColor}`
            }`}
          >
            {/* Card Top: Avatar & Count */}
            <div className="flex items-center justify-between">
              {member.signed_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.signed_avatar_url}
                  alt={member.display_name}
                  className="w-10 h-10 rounded-xl object-cover border border-white shadow-2xs"
                />
              ) : (
                <div className={`w-10 h-10 rounded-xl ${theme.avatarBg} font-bold text-sm flex items-center justify-center shadow-xs`}>
                  {member.display_name.charAt(0).toUpperCase()}
                </div>
              )}

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all shadow-2xs ${
                isClicked 
                  ? 'bg-indigo-600 text-white animate-pulse' 
                  : 'bg-white/90 border border-slate-200/70 text-slate-600'
              }`}>
                {isClicked ? 'Opening...' : docCount === 0 ? 'Empty' : `${docCount} doc${docCount > 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Card Bottom: Name & Action */}
            <div className="mt-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate group-hover:text-black transition-colors">
                {member.display_name}
              </h3>
              <div className={`text-[11px] font-semibold flex items-center gap-1 mt-1 transition-colors ${
                isClicked ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-900'
              }`}>
                {isClicked ? (
                  <>
                    <svg className="w-3 h-3 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <span>View documents</span>
                    <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
