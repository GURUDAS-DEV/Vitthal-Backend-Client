-- Add approval lifecycle columns to vendors table
ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS approved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Index for fast pending-vendor queries by admin
CREATE INDEX IF NOT EXISTS idx_vendors_approval_status ON vendors(approval_status);
