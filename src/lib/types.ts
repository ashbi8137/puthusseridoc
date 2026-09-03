// Family member configuration
export interface FamilyMember {
  id: string
  name: string
  display_name: string
  email: string | null
  emoji?: string
  slug: string
  avatar_url?: string | null
}

// Document record from database
export interface Document {
  id: string
  family_member_id: string
  document_type: string
  document_name: string
  is_common_document: boolean
  file_path: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
  updated_at: string
}

// Document with family member info joined
export interface DocumentWithMember extends Document {
  family_members: {
    name: string
    display_name: string
    slug: string
    emoji?: string
    avatar_url?: string | null
  }
}

// Common document type definition
export interface CommonDocumentType {
  type: string
  name: string
  emoji?: string
}

// Upload step in the wizard
export type UploadStep = 'type' | 'document' | 'file' | 'uploading' | 'success'
