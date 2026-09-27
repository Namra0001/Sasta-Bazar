
-- Migration: 20251020094942
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  mobile_no TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create addresses table
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Addresses policies
CREATE POLICY "Users can view their own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  delivery_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create order_feedback table
CREATE TABLE public.order_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id, user_id)
);

-- Enable RLS on order_feedback
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- Order feedback policies
CREATE POLICY "Users can view their own feedback"
  ON public.order_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON public.order_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON public.order_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251020095017
-- Fix function search path for security
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251021060138
-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  category TEXT NOT NULL,
  gender TEXT,
  brand TEXT,
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  specifications JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  seller_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

-- Sellers can insert their own products
CREATE POLICY "Sellers can insert products"
ON public.products
FOR INSERT
WITH CHECK (true);

-- Sellers can update their own products
CREATE POLICY "Sellers can update their products"
ON public.products
FOR UPDATE
USING (true);

-- Sellers can delete their own products
CREATE POLICY "Sellers can delete their products"
ON public.products
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anyone can update product images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can delete product images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-images');

-- Migration: 20251026100532
-- Add customer details columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS seller_id uuid;

-- Update RLS policy to allow sellers to view orders
CREATE POLICY "Sellers can view all orders" ON orders
  FOR SELECT
  USING (true);

-- Allow users to update order status (for cancellation)
CREATE POLICY "Users can update their order status" ON orders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Migration: 20251028101043
-- Create product_reviews table
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reviews"
  ON public.product_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for review photos
CREATE POLICY "Anyone can view review photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "Authenticated users can upload review photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-photos' AND auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update product rating and review count
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.product_reviews
      WHERE product_id = NEW.product_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.product_reviews
      WHERE product_id = NEW.product_id
    )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update product rating after review insert/update
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating();
-- Create function to update product stock and sales after order
CREATE OR REPLACE FUNCTION update_product_stock_and_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when order status changes to a completed state
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('delivered', 'completed')) 
     OR (TG_OP = 'INSERT' AND NEW.status IN ('delivered', 'completed')) THEN
    
    -- Update stock and sold_count for each item in the order
    DECLARE
      item JSONB;
    BEGIN
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        UPDATE products
        SET 
          stock = stock - (item->>'quantity')::integer,
          sold_count = sold_count + (item->>'quantity')::integer
        WHERE id = (item->>'product_id')::uuid;
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order updates
DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON orders;
CREATE TRIGGER trigger_update_stock_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_and_sales();
-- Function to update product stock and sales when order is delivered
CREATE OR REPLACE FUNCTION update_product_stock_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  item_quantity INTEGER;
  item_product_id UUID;
BEGIN
  -- Only process when order status changes to delivered or completed
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('delivered', 'completed') AND OLD.status != NEW.status)
     OR (TG_OP = 'INSERT' AND NEW.status IN ('delivered', 'completed')) THEN
    
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_quantity := (item->>'quantity')::integer;
      item_product_id := (item->>'product_id')::uuid;
      
      -- Update stock and sold_count for the product
      UPDATE products
      SET 
        stock = GREATEST(0, stock - item_quantity),
        sold_count = sold_count + item_quantity
      WHERE id = item_product_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_stock_on_delivery ON orders;

CREATE TRIGGER trigger_update_stock_on_delivery
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_delivery();
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seller role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'seller');

-- Update products RLS policies to check seller role
DROP POLICY IF EXISTS "Sellers can insert products" ON public.products;
CREATE POLICY "Sellers can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'seller'));

DROP POLICY IF EXISTS "Sellers can update their products" ON public.products;
CREATE POLICY "Sellers can update their products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'seller') AND seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can delete their products" ON public.products;
CREATE POLICY "Sellers can delete their products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'seller') AND seller_id = auth.uid());

-- Update orders RLS to filter by seller
DROP POLICY IF EXISTS "Sellers can view all orders" ON public.orders;
CREATE POLICY "Sellers can view their product orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'seller') AND
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.seller_id = auth.uid()
    AND p.id IN (
      SELECT (item->>'product_id')::uuid
      FROM jsonb_array_elements(orders.items) AS item
    )
  )
);

CREATE POLICY "Sellers can update order status"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'seller') AND
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.seller_id = auth.uid()
    AND p.id IN (
      SELECT (item->>'product_id')::uuid
      FROM jsonb_array_elements(orders.items) AS item
    )
  )
);
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
-- Add explicit public access denial policies for defense-in-depth

-- Deny all public/anonymous access to profiles table
CREATE POLICY "Deny public access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Deny all public/anonymous access to orders table
CREATE POLICY "Deny public access to orders"
ON public.orders
FOR ALL
TO anon
USING (false);
-- Add explicit public access denial policies for remaining sensitive tables

-- Deny all public/anonymous access to addresses table
CREATE POLICY "Deny public access to addresses"
ON public.addresses
FOR ALL
TO anon
USING (false);

-- Deny all public/anonymous access to seller_profiles table
CREATE POLICY "Deny public access to seller_profiles"
ON public.seller_profiles
FOR ALL
TO anon
USING (false);

-- Deny all public/anonymous access to user_roles table
CREATE POLICY "Deny public access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);

-- Deny all public/anonymous access to order_feedback table
CREATE POLICY "Deny public access to order_feedback"
ON public.order_feedback
FOR ALL
TO anon
USING (false);
-- Add video_url column to product_reviews
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS video_url text;

-- Create trigger to update product rating when review is added/updated
DROP TRIGGER IF EXISTS on_review_added ON public.product_reviews;
CREATE TRIGGER on_review_added
  AFTER INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating();
-- Create trigger to update product stock and sold_count when order status changes to delivered
CREATE TRIGGER update_stock_on_order_delivery
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock_on_delivery();
-- Update trigger function to include 'received' status
CREATE OR REPLACE FUNCTION public.update_product_stock_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item JSONB;
  item_quantity INTEGER;
  item_product_id UUID;
BEGIN
  -- Only process when order status changes to delivered, completed, or received
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('delivered', 'completed', 'received') AND OLD.status != NEW.status)
     OR (TG_OP = 'INSERT' AND NEW.status IN ('delivered', 'completed', 'received')) THEN
    
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_quantity := (item->>'quantity')::integer;
      item_product_id := (item->>'product_id')::uuid;
      
      -- Update stock and sold_count for the product
      UPDATE products
      SET 
        stock = GREATEST(0, stock - item_quantity),
        sold_count = sold_count + item_quantity
      WHERE id = item_product_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;
-- Drop duplicate stock update triggers, keep only one
DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON orders;
DROP TRIGGER IF EXISTS trigger_update_stock_on_delivery ON orders;

-- Drop the duplicate function
DROP FUNCTION IF EXISTS public.update_product_stock_and_sales();

-- Keep only one trigger for stock updates
-- Trigger update_stock_on_order_delivery already exists with update_product_stock_on_delivery function
-- Add arrays for multiple images and videos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}';
-- Ensure profiles + addresses exist (fixes PostgREST: table not in schema cache)
-- Safe to run on projects where tables were never migrated.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  mobile_no TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
CREATE POLICY "Users can view their own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
CREATE POLICY "Users can insert their own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;
CREATE POLICY "Users can delete their own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at helper (skip if function already exists from older migrations)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON public.addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
