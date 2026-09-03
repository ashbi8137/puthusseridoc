'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { MAJOR_DOCUMENT_TYPES } from '@/lib/constants'
import Link from 'next/link'

interface SearchDocResult {
  id: string
  document_name: string
  document_type: string
  file_name: string
  file_type: string
  family_members: {
    display_name: string
    slug: string
  }
}

interface SearchMemberResult {
  id: string
  display_name: string
  slug: string
}

export default function SearchSection() {
  const [query, setQuery] = useState('')
  const [docResults, setDocResults] = useState<SearchDocResult[]>([])
  const [memberResults, setMemberResults] = useState<SearchMemberResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  // Close search popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const executeSearch = useCallback(async (searchQuery: string) => {
    const term = searchQuery.trim()
    if (!term) {
      setDocResults([])
      setMemberResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setIsOpen(true)

    try {
      // 1. Search documents table by name, file_name, or document_type
      const { data: docs, error: docError } = await supabase
        .from('documents')
        .select('id, document_name, document_type, file_name, file_type, family_members(display_name, slug)')
        .or(`document_name.ilike.%${term}%,file_name.ilike.%${term}%,document_type.ilike.%${term}%`)
        .limit(8)

      if (!docError && docs) {
        setDocResults(docs as unknown as SearchDocResult[])
      }

      // 2. Search family members table by name or display_name
      const { data: members, error: memberError } = await supabase
        .from('family_members')
        .select('id, display_name, slug')
        .or(`display_name.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(4)

      if (!memberError && members) {
        setMemberResults(members as SearchMemberResult[])
      }
    } catch (err) {
      console.error('Search execution error:', err)
    } finally {
      setIsSearching(false)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        executeSearch(query)
      } else {
        setDocResults([])
        setMemberResults([])
        setIsOpen(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, executeSearch])

  // Filter matched major document types
  const matchingCategories = query.trim()
    ? MAJOR_DOCUMENT_TYPES.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase())
      )
    : []

  const hasResults = docResults.length > 0 || memberResults.length > 0 || matchingCategories.length > 0

  return (
    <div className="relative z-30" ref={containerRef}>
      {/* Modern Floating Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input 
          type="text" 
          value={query}
          onFocus={() => query.trim() && setIsOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents, IDs, family members..." 
          className="w-full bg-white/95 hover:bg-white focus:bg-white border border-slate-200/90 hover:border-slate-300 text-slate-900 rounded-2xl py-3 pl-10 pr-9 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium placeholder:text-slate-400"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setDocResults([])
              setMemberResults([])
              setIsOpen(false)
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Popover Results Card */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-98 duration-150">
          {/* Family Member Results */}
          {memberResults.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">Family Members</p>
              {memberResults.map(member => (
                <Link
                  key={member.id}
                  href={`/family/${member.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {member.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-900">{member.display_name}</span>
                  </div>
                  <span className="text-xs text-indigo-600 font-medium">View documents →</span>
                </Link>
              ))}
            </div>
          )}

          {/* Document Results */}
          {docResults.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">Documents Found</p>
              {docResults.map(doc => {
                const isPdf = doc.file_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf')
                return (
                  <Link 
                    key={doc.id} 
                    href={`/view/${doc.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 ${
                        isPdf ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isPdf ? 'PDF' : 'IMG'}
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">{doc.document_name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {doc.family_members?.display_name}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Matched Categories */}
          {matchingCategories.length > 0 && docResults.length === 0 && (
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">Document Types</p>
              {matchingCategories.slice(0, 3).map(t => (
                <div key={t.type} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!hasResults && !isSearching && (
            <div className="p-5 text-center text-slate-400 text-xs">
              No matching documents or family members found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Loading spinner */}
          {isSearching && (
            <div className="p-4 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Searching documents...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
