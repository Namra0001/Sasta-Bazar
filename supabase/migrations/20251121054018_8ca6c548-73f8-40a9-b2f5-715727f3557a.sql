-- Create seller_profiles table for business information
CREATE TABLE public.seller_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  business_name text,
  business_description text,
  store_logo_url text,
  business_address text,
  business_phone text,
  business_email text,
  website_url text,
  facebook_url text,
  instagram_url text,
  twitter_url text,
  business_hours jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sellers can view their own profile"
ON public.seller_profiles
FOR SELECT
USING (has_role(auth.uid(), 'seller'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Sellers can insert their own profile"
ON public.seller_profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'seller'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Sellers can update their own profile"
ON public.seller_profiles
FOR UPDATE
USING (has_role(auth.uid(), 'seller'::app_role) AND auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_seller_profiles_updated_at
BEFORE UPDATE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();