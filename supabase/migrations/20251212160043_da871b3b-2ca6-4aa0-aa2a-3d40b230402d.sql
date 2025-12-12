-- Allow all authenticated users to view stock movements for device availability
CREATE POLICY "Authenticated users can view stock movements"
ON public.stock_movements
FOR SELECT
USING (auth.uid() IS NOT NULL);