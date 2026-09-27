-- Add arrays for multiple images and videos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}';