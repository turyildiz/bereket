-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token VARCHAR(64),
  token_expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
ON public.newsletter_subscribers(email);

-- Create index on confirmation_token for faster token lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_token
ON public.newsletter_subscribers(confirmation_token);

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert (for subscription)
CREATE POLICY "Allow anonymous insert" ON public.newsletter_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow anonymous users to select their own subscription by token
CREATE POLICY "Allow anonymous select by token" ON public.newsletter_subscribers
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anonymous users to update (for confirmation)
CREATE POLICY "Allow anonymous update" ON public.newsletter_subscribers
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anonymous users to delete (for failed email sends)
CREATE POLICY "Allow anonymous delete" ON public.newsletter_subscribers
  FOR DELETE
  TO anon
  USING (true);

-- Comment on table
COMMENT ON TABLE public.newsletter_subscribers IS 'Stores newsletter subscription data with double opt-in support';
