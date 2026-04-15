-- SETUP INSTRUCTIONS:
-- 1. Create a new database (in psql): CREATE DATABASE vitthal_db;
-- 2. Connect to it: \c vitthal_db;
-- 3. Then run this entire script.

-- This schema is designed to be idempotent where PostgreSQL supports it.

-- ============================================
-- B2B Multi-Vendor Marketplace - PostgreSQL Schema
-- ============================================

-- ================================
-- EXTENSIONS
-- ================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- PostGIS is optional. This schema stores latitude/longitude as numeric columns,
-- so it works on plain PostgreSQL without PostGIS installed.

-- ================================
-- TYPES
-- ================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('client', 'vendor', 'admin', 'super_admin');
    END IF;
END$$;

-- ================================
-- AUTHENTICATION LAYER
-- ================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Kept for compatibility with current auth flow.
    name VARCHAR(100),
    refresh_token TEXT,
    otp TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================
-- BUSINESS LAYER
-- ================================

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    gst_number TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    rating NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_vendors_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ================================
-- CATALOG LAYER
-- ================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    product_type TEXT,
    specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_products_product_type
        CHECK (product_type IS NULL OR product_type IN ('plastic', 'metal'))
);

-- ================================
-- TRANSACTION LOGIC LAYER
-- ================================

CREATE TABLE IF NOT EXISTS vendor_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    moq INTEGER NOT NULL CHECK (moq > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    lead_time_days INTEGER CHECK (lead_time_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_vendor_product UNIQUE (vendor_id, product_id),
    CONSTRAINT fk_vendor_products_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vendor_products_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendors(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_product_id UUID NOT NULL,
    min_qty INTEGER NOT NULL CHECK (min_qty > 0),
    max_qty INTEGER,
    price_per_unit NUMERIC(12,2) NOT NULL CHECK (price_per_unit >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pricing_tiers_qty_range
        CHECK (max_qty IS NULL OR max_qty >= min_qty),
    CONSTRAINT unique_tier_start UNIQUE (vendor_product_id, min_qty),
    CONSTRAINT fk_pricing_tiers_vendor_product
        FOREIGN KEY (vendor_product_id)
        REFERENCES vendor_products(id)
        ON DELETE CASCADE
);

-- ================================
-- INDEXES
-- ================================

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_vendors_city_state_country
ON vendors(city, state, country);
CREATE INDEX IF NOT EXISTS idx_vendors_lat_lng
ON vendors(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active
ON vendors(is_active);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_subcategory
ON products(category, subcategory);

CREATE INDEX IF NOT EXISTS idx_vendor_products_product_id
ON vendor_products(product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor_id
ON vendor_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_active_price
ON vendor_products(is_active, price);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_vendor_product_id_min_qty
ON pricing_tiers(vendor_product_id, min_qty);

-- ================================
-- AUTO-UPDATE TIMESTAMP FUNCTION + TRIGGERS
-- ================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'users',
        'vendors',
        'products',
        'vendor_products',
        'pricing_tiers'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON %I;', table_name, table_name);
        EXECUTE format(
            'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
            table_name,
            table_name
        );
    END LOOP;
END$$;

