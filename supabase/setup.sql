-- ============================================
-- Puthusseri Vault — Complete Supabase Setup
-- ============================================
-- Safe to run multiple times (idempotent)
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- 1. CREATE TABLES
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  is_common_document BOOLEAN DEFAULT false,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_family_member ON public.documents(family_member_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_search ON public.documents(document_name);

-- Allow NULL for family_member_id (for shared Common Documents)
ALTER TABLE public.documents ALTER COLUMN family_member_id DROP NOT NULL;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. HELPER FUNCTION (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_approved_family_member()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- 4. RLS POLICIES — family_members table
DROP POLICY IF EXISTS "Approved family members can view all members" ON public.family_members;
DROP POLICY IF EXISTS "Users can check their own membership" ON public.family_members;
DROP POLICY IF EXISTS "Approved family members can update members" ON public.family_members;

CREATE POLICY "Users can check their own membership"
  ON public.family_members
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    OR public.is_approved_family_member()
  );

CREATE POLICY "Approved family members can update members"
  ON public.family_members
  FOR UPDATE
  TO authenticated
  USING (public.is_approved_family_member())
  WITH CHECK (public.is_approved_family_member());

-- 5. RLS POLICIES — documents table
DROP POLICY IF EXISTS "Approved family members can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Approved family members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Approved family members can update documents" ON public.documents;
DROP POLICY IF EXISTS "Approved family members can delete documents" ON public.documents;

CREATE POLICY "Approved family members can view all documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (public.is_approved_family_member());

CREATE POLICY "Approved family members can insert documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved_family_member());

CREATE POLICY "Approved family members can update documents"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (public.is_approved_family_member());

CREATE POLICY "Approved family members can delete documents"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (public.is_approved_family_member());

-- 6. SEED DATA — Family Members
DELETE FROM public.family_members WHERE slug IN ('dad', 'mom', 'brother');

INSERT INTO public.family_members (name, display_name, email, slug) VALUES
  ('Ashbin', 'Ashbin', 'ashputhusseri@gmail.com', 'ashbin'),
  ('Abdurahiman', 'Abdurahiman', 'parahiman1968@gmail.com', 'abdurahiman'),
  ('Shareena', 'Shareena', 'shareena432@gmail.com', 'shareena'),
  ('Shamil', 'Shamil', 'shamilputhusheri@gmail.com', 'shamil')
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email;

-- 7. STORAGE POLICIES
DROP POLICY IF EXISTS "Approved members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Approved members can view files" ON storage.objects;
DROP POLICY IF EXISTS "Approved members can update files" ON storage.objects;
DROP POLICY IF EXISTS "Approved members can delete files" ON storage.objects;

CREATE POLICY "Approved members can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'family-documents'
    AND public.is_approved_family_member()
  );

CREATE POLICY "Approved members can view files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'family-documents'
    AND public.is_approved_family_member()
  );

CREATE POLICY "Approved members can update files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'family-documents'
    AND public.is_approved_family_member()
  );

CREATE POLICY "Approved members can delete files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'family-documents'
    AND public.is_approved_family_member()
  );
