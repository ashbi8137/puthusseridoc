'use client'

import { useState, useRef, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MAJOR_DOCUMENT_TYPES, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  memberSlug: string
  memberId: string
  existingDocs: any[]
}

export default function UploadModal({ isOpen, onClose, memberSlug, memberId, existingDocs }: UploadModalProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [selectedType, setSelectedType] = useState<string>('')
  const [customName, setCustomName] = useState<string>('')
  const [isImportant, setIsImportant] = useState<boolean>(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  if (!isOpen) return null

  const resetState = () => {
    setSelectedType('')
    setCustomName('')
    setIsImportant(true)
    setIsDropdownOpen(false)
    setFile(null)
    setFileError(null)
    setIsUploading(false)
    setUploadProgress(0)
    setUploadError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleSelectType = (type: string, name: string) => {
    setSelectedType(type)
    setIsDropdownOpen(false)

    if (type === 'other') {
      setIsImportant(false)
      setCustomName('')
    } else {
      setIsImportant(true)
      setCustomName(name)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
        setFileError('Please select a PDF, JPG, or PNG file.')
        return
      }
      
      if (selectedFile.size > MAX_FILE_SIZE) {
        setFileError('File is too large. Maximum size is 10MB.')
        return
      }
      
      setFile(selectedFile)
    }
  }

  const isFormValid = Boolean(
    selectedType &&
    (selectedType !== 'other' || customName.trim()) &&
    file &&
    !isUploading
  )

  const selectedDocObj = MAJOR_DOCUMENT_TYPES.find(d => d.type === selectedType)
  const displayLabel = selectedType === 'other'
    ? 'Other Document'
    : selectedDocObj?.name || ''

  const existingMatch = selectedType && selectedType !== 'other'
    ? existingDocs.find(d => d.document_type === selectedType)
    : null

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || !file) return

    setIsUploading(true)
    setUploadError(null)
    setUploadProgress(15)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const isCommon = isImportant
      const docType = selectedType === 'other' ? 'other' : selectedType
      const docName = selectedType === 'other'
        ? customName.trim()
        : (selectedDocObj?.name || customName.trim())

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${memberSlug}/${docType}/${fileName}`

      // Replace existing file of this specific type if it exists
      if (selectedType !== 'other' && existingMatch) {
        await supabase.storage.from('family-documents').remove([existingMatch.file_path])
        await supabase.from('documents').delete().eq('id', existingMatch.id)
      }

      setUploadProgress(45)

      // Upload file to private Supabase storage
      const { error: uploadErr } = await supabase.storage
        .from('family-documents')
        .upload(filePath, file)

      if (uploadErr) throw uploadErr

      setUploadProgress(80)

      // Save document record in PostgreSQL
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          family_member_id: memberId,
          document_type: docType,
          document_name: docName,
          is_common_document: isCommon,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id
        })

      if (dbError) throw dbError

      setUploadProgress(100)
      setSuccess(true)
      
      setTimeout(() => {
        handleClose()
        router.refresh()
      }, 1200)

    } catch (error: any) {
      console.error("Upload error:", error)
      setUploadError(error.message || "Failed to upload document. Please try again.")
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200" 
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[94vh] flex flex-col animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-blue-50/20">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Upload Document</h2>
            <p className="text-xs text-slate-500 mt-0.5">Secure private family vault</p>
          </div>
          <button 
            onClick={handleClose} 
            disabled={isUploading}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/60 transition-colors shadow-2xs"
          >
            <span className="sr-only">Close</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {success ? (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Document Uploaded</h3>
              <p className="text-slate-500 text-xs sm:text-sm">Saved securely to family vault.</p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              {/* 1. Custom Beautiful Dropdown Component */}
              <div className="space-y-1.5" ref={dropdownRef}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => !isUploading && setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full flex items-center justify-between bg-slate-50 hover:bg-white focus:bg-white border rounded-2xl px-4 py-3.5 text-left text-sm font-medium transition-all shadow-2xs cursor-pointer ${
                      isDropdownOpen 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-2 h-2 rounded-full ${selectedType ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span className={selectedType ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'}>
                        {selectedType ? displayLabel : 'Choose Document Type...'}
                      </span>
                    </div>
                    <svg 
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Floating Custom Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-1.5 space-y-0.5">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Major Documents
                        </div>
                        {MAJOR_DOCUMENT_TYPES.map((doc) => {
                          const isSelected = selectedType === doc.type
                          return (
                            <button
                              key={doc.type}
                              type="button"
                              onClick={() => handleSelectType(doc.type, doc.name)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left ${
                                isSelected 
                                  ? 'bg-indigo-50/80 text-indigo-700 font-semibold' 
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{doc.name}</span>
                              {isSelected && (
                                <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <div className="p-1.5 bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => handleSelectType('other', '')}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left ${
                            selectedType === 'other'
                              ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Other Document</span>
                          </div>
                          {selectedType === 'other' && (
                            <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Custom Document Name (When 'Other Document' is selected) */}
              {selectedType === 'other' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label htmlFor="custom-doc-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Document Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="custom-doc-name"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., Vehicle Purchase Agreement, Medical Certificate"
                    disabled={isUploading}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    autoFocus
                  />
                </div>
              )}

              {/* 3. Toggle Button between Important Documents and Other Documents */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Save under Section
                </label>
                <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 gap-1">
                  <button
                    type="button"
                    onClick={() => setIsImportant(true)}
                    disabled={isUploading}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isImportant
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <span>Important Documents</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportant(false)}
                    disabled={isUploading}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isImportant
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <span>Other Documents</span>
                  </button>
                </div>
              </div>

              {/* Notice if replacing existing document */}
              {existingMatch && (
                <div className="bg-amber-50 text-amber-900 px-3.5 py-2.5 rounded-2xl text-xs border border-amber-200/80">
                  Note: An existing <strong>{existingMatch.document_name}</strong> already exists and will be updated.
                </div>
              )}

              {/* 4. Upload File Section */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-4 sm:p-5 text-center transition-all flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
                >
                  {file ? (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm break-all">{file.name}</span>
                      <span className="text-[11px] text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Tap to change
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-700 text-xs sm:text-sm">Choose PDF or Image</span>
                      <span className="text-[11px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                    </>
                  )}
                </button>
                {fileError && (
                  <p className="text-rose-600 text-xs mt-1">{fileError}</p>
                )}
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-2xl text-xs border border-rose-100">
                  {uploadError}
                </div>
              )}

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit & Cancel Buttons */}
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || isUploading}
                  className="w-2/3 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl py-3 text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload Document</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
