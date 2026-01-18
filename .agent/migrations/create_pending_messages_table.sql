-- Create pending_messages table for the "waiting room"
-- This table temporarily stores incoming WhatsApp messages for merging and validation

CREATE TABLE IF NOT EXISTS pending_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_number TEXT NOT NULL,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    
    -- Message content (merged from multiple messages)
    caption TEXT,
    image_url TEXT,
    wamid TEXT, -- WhatsApp message ID of the last message
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Processing status
    is_processing BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    
    -- Unique constraint: one pending message per sender at a time
    CONSTRAINT unique_sender_pending UNIQUE (sender_number, market_id)
);

-- Index for quick lookups by sender and timestamp
CREATE INDEX idx_pending_messages_sender ON pending_messages(sender_number);
CREATE INDEX idx_pending_messages_last_updated ON pending_messages(last_updated_at);
CREATE INDEX idx_pending_messages_market ON pending_messages(market_id);

-- Enable Row Level Security
ALTER TABLE pending_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for API routes)
CREATE POLICY "Service role has full access to pending_messages"
ON pending_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
