# Puthusseri Vault

A private, secure family document vault web application built with **Next.js 16 (App Router)**, **Tailwind CSS**, and **Supabase (PostgreSQL & Private Cloud Storage)**.

---

## Features

- **Google OAuth Authentication**: Restricted strictly to approved family member accounts.
- **Family Member Folders**: Clean 2x2 mobile grid with individual member color palettes and real-time document counts.
- **Profile Photo Uploads**: Each family member can upload and personalize their profile photo.
- **Visual Document Previews**: Automatic image thumbnails for picture uploads and dedicated PDF badges.
- **Unified Upload Flow**: Single-page modal with custom floating dropdown and segmented toggle between *Important Documents* and *Other Documents*.
- **Multi-Field Vault Search**: Search simultaneously across document names, file names, categories, and family members.
- **Encrypted Private Storage**: Files stored in private Supabase bucket with time-limited signed URLs.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security, Google OAuth)
- **Storage**: Supabase Private Storage Bucket (`family-documents`)
- **Language**: TypeScript

---

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Setup

Run the SQL script located in `supabase/setup.sql` in your Supabase SQL Editor:
- Creates `family_members` and `documents` tables with indexes.
- Seeds family members.
- Configures secure Row-Level Security (RLS) policies.
- Sets up storage bucket policies for `family-documents`.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
