import type { CommonDocumentType } from './types'

// Primary common documents tracked with checklist status on member pages (Alphabetical A → Z)
export const PRIMARY_DOCUMENT_TYPES: CommonDocumentType[] = [
  { type: 'aadhaar', name: 'Aadhaar Card' },
  { type: 'driving_license', name: 'Driving Licence' },
  { type: 'pan', name: 'PAN Card' },
  { type: 'passport', name: 'Passport' },
  { type: 'ration_card', name: 'Ration Card' },
  { type: 'voter_id', name: 'Voter ID' },
]

// Common document types backwards compatibility
export const COMMON_DOCUMENT_TYPES = PRIMARY_DOCUMENT_TYPES

// All major document options shown in the upload dropdown (Alphabetical A → Z)
export const MAJOR_DOCUMENT_TYPES: { type: string; name: string }[] = [
  { type: 'sslc', name: '10th / SSLC Certificate' },
  { type: 'plus_two', name: '12th / Plus Two Certificate' },
  { type: 'aadhaar', name: 'Aadhaar Card' },
  { type: 'bank_passbook', name: 'Bank Passbook / Statement' },
  { type: 'birth_certificate', name: 'Birth Certificate' },
  { type: 'degree', name: 'Degree / Diploma Certificate' },
  { type: 'driving_license', name: 'Driving Licence' },
  { type: 'pan', name: 'PAN Card' },
  { type: 'passport', name: 'Passport' },
  { type: 'ration_card', name: 'Ration Card' },
  { type: 'vehicle_rc', name: 'Vehicle RC' },
  { type: 'voter_id', name: 'Voter ID' },
]

// Allowed file types for upload
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']

// Max file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Signed URL expiry in seconds (5 minutes)
export const SIGNED_URL_EXPIRY = 300

// Storage bucket name
export const STORAGE_BUCKET = 'family-documents'

// App metadata
export const APP_NAME = 'Puthusseri Documents'
export const APP_TAGLINE = "Our family's important documents, always within reach."
