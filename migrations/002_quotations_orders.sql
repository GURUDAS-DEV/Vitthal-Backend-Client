-- ─── Quotations ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    vendor_id         UUID        NOT NULL REFERENCES vendors(id)  ON DELETE CASCADE,
    product_id        UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity          INTEGER     NOT NULL CHECK (quantity > 0),
    client_message    TEXT,

    -- Lifecycle
    status            TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'responded', 'accepted', 'rejected', 'expired')),

    -- Vendor response fields (populated when vendor responds)
    vendor_price      NUMERIC(12,2),
    vendor_message    TEXT,
    valid_until       TIMESTAMPTZ,
    responded_at      TIMESTAMPTZ,

    -- Resolution timestamps
    accepted_at       TIMESTAMPTZ,
    rejected_at       TIMESTAMPTZ,
    rejection_reason  TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate open quotes for the same client+vendor+product combination
-- (enforced in application logic, but documented here for clarity)

CREATE INDEX IF NOT EXISTS idx_quotations_client_user ON quotations(client_user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vendor      ON quotations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status      ON quotations(status);

-- ─── Orders (basic – created from accepted quotes) ─────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    client_user_id   UUID         NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
    vendor_id        UUID         NOT NULL REFERENCES vendors(id)     ON DELETE RESTRICT,
    product_id       UUID         NOT NULL REFERENCES products(id)    ON DELETE RESTRICT,
    quotation_id     UUID         REFERENCES quotations(id)           ON DELETE SET NULL,
    quantity         INTEGER      NOT NULL CHECK (quantity > 0),
    unit_price       NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    total_amount     NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),

    -- Order lifecycle
    status           TEXT         NOT NULL DEFAULT 'placed'
                                  CHECK (status IN (
                                    'placed', 'confirmed', 'packed',
                                    'shipped_to_fulfillment', 'at_fulfillment',
                                    'out_for_delivery', 'delivered', 'cancelled'
                                  )),

    -- Payment lifecycle
    payment_status   TEXT         NOT NULL DEFAULT 'pending'
                                  CHECK (payment_status IN ('pending', 'paid', 'in_escrow', 'released', 'refunded')),

    -- Delivery address (snapshot at time of order)
    shipping_address TEXT,
    shipping_city    TEXT,
    shipping_state   TEXT,
    shipping_country TEXT,
    shipping_pincode VARCHAR(6),

    notes            TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_client  ON orders(client_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor  ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
