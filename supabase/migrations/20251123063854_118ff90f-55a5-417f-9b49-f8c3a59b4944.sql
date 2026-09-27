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