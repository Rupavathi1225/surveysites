-- Add approval workflow fields to offers table
ALTER TABLE offers 
ADD COLUMN approval_status TEXT DEFAULT 'pending',
ADD COLUMN approved_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by TEXT,
ADD COLUMN rejection_reason TEXT;

-- Add indexes for better performance
CREATE INDEX idx_offers_approval_status ON offers(approval_status);
CREATE INDEX idx_offers_approved_date ON offers(approved_date);