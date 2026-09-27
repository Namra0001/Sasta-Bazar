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