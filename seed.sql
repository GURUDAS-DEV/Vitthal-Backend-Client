-- ============================================================
-- Vitthal B2B Marketplace — Seed Data
-- Run inside vitthal_db: \i seed.sql
-- ============================================================

-- ----------------------------------------
-- 1. VENDOR USERS  (role = 'vendor')
-- ----------------------------------------
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Shree Polymers Admin',    'admin@shreepolymers.com',   crypt('Password@123', gen_salt('bf')), 'vendor'),
  ('a1000000-0000-0000-0000-000000000002', 'Kailash Metals Admin',    'admin@kailashmetals.com',   crypt('Password@123', gen_salt('bf')), 'vendor'),
  ('a1000000-0000-0000-0000-000000000003', 'Venkat Industrial Admin', 'admin@venkatind.com',       crypt('Password@123', gen_salt('bf')), 'vendor'),
  ('a1000000-0000-0000-0000-000000000004', 'Om Sai Steels Admin',     'admin@omsaisteels.com',     crypt('Password@123', gen_salt('bf')), 'vendor')
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------
-- 2. VENDORS
-- ----------------------------------------
INSERT INTO vendors (id, user_id, company_name, gst_number, phone, rating) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Shree Polymers Pvt. Ltd.',  '24AAAAA0000A1Z5', '+91 9000000001', 4.5),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Kailash Metals',            '27BBBBB0000B1Z5', '+91 9000000002', 4.3),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'Venkat Industrial Supply',  '36CCCCC0000C1Z5', '+91 9000000003', 4.1),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'Om Sai Steels',             '27DDDDD0000D1Z5', '+91 9000000004', 4.7)
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------
-- 3. PRODUCTS
-- ----------------------------------------
INSERT INTO products (id, name, description, category, product_type, specifications) VALUES

  -- Plastic
  ('c1000000-0000-0000-0000-000000000001', 'HDPE Plastic Granules',
   'High-density polyethylene granules suitable for pipes, containers, and packaging.',
   'plastic', 'plastic',
   '{"grade":"HD50MA180","mfi":"0.2 g/10min","density":"0.95 g/cm3","form":"granules"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000002', 'Industrial PVC Resin',
   'Suspension-grade PVC resin for industrial pipe, profile, and sheet applications.',
   'plastic', 'plastic',
   '{"grade":"SG-5","K_value":67,"bulk_density":"0.55 g/ml","form":"powder"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000003', 'PP Injection Grade',
   'Polypropylene homopolymer injection moulding grade for rigid packaging and automotive parts.',
   'plastic', 'plastic',
   '{"grade":"H110MA","mfi":"12 g/10min","density":"0.905 g/cm3","form":"granules"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000004', 'ABS Polymer',
   'General-purpose acrylonitrile butadiene styrene for housings, enclosures, and consumer goods.',
   'plastic', 'plastic',
   '{"grade":"GP-22","mfi":"22 g/10min","impact_strength":"220 J/m","form":"granules"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000005', 'LLDPE Film Grade',
   'Linear low-density polyethylene film grade for stretch films and flexible packaging.',
   'plastic', 'plastic',
   '{"grade":"LL-0220KJ","mfi":"2.2 g/10min","density":"0.920 g/cm3","form":"granules"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000006', 'PET Bottle Flakes',
   'Recycled PET flakes sourced from post-consumer beverage bottles, cleaned and sorted.',
   'plastic', 'plastic',
   '{"colour":"clear","IV":"0.72-0.80 dl/g","moisture":"<0.5%","form":"flakes"}'::jsonb),

  -- Metal
  ('c1000000-0000-0000-0000-000000000007', 'Stainless Steel Sheets',
   'AISI 304 grade cold-rolled stainless steel sheets for food processing and industrial use.',
   'metal', 'metal',
   '{"grade":"SS304","thickness":"1.2 mm","width":"1220 mm","finish":"2B"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000008', 'Cold Rolled Steel Coil',
   'Cold rolled mild steel coils for automotive, appliance, and general engineering applications.',
   'metal', 'metal',
   '{"grade":"CR3","thickness":"0.8 mm","width":"1000 mm","temper":"soft"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000009', 'Galvanized Iron Sheets',
   'Hot-dip galvanized steel sheets with zinc coating for corrosion protection in construction.',
   'metal', 'metal',
   '{"grade":"GI-120","thickness":"0.5 mm","coating":"120 g/m2","width":"1000 mm"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000010', 'Aluminium Ingots',
   'Primary aluminium ingots of 99.7% purity for casting and alloying operations.',
   'metal', 'metal',
   '{"grade":"P1020A","purity":"99.7%","weight_per_piece":"22.7 kg","form":"T-bar ingot"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000011', 'MS Round Bars',
   'Mild steel (IS:2062) round bars for construction, shafts, and general fabrication.',
   'metal', 'metal',
   '{"grade":"IS2062-E250","diameter":"25 mm","length":"6 m","finish":"black"}'::jsonb),

  ('c1000000-0000-0000-0000-000000000012', 'Copper Wire Rods',
   'EC-grade high-conductivity copper wire rods for electrical conductor manufacturing.',
   'metal', 'metal',
   '{"grade":"EC","purity":"99.97%","diameter":"8 mm","conductivity":">100% IACS"}'::jsonb)

ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- 4. PRODUCT IMAGES  (one primary per product)
-- ----------------------------------------
INSERT INTO products_images (product_id, image_url, is_primary, display_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1579632652768-6cb9dcf85912?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1565060290692-3d7573dbb5f3?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1572616766092-5f1f0d2f6d78?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1579632652839-2d3ec3f705d7?auto=format&fit=crop&w=900&q=80', true,  1),
  ('c1000000-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1532634993-15f421e42ec0?auto=format&fit=crop&w=900&q=80', true,  1);

-- ----------------------------------------
-- 5. VENDOR PRODUCTS  (price / moq / stock)
-- ----------------------------------------
-- Vendor 1 (Shree Polymers) → plastic products
INSERT INTO vendor_products (product_id, vendor_id, price, moq, stock_quantity, commision_percentage) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 120.00, 100, 5000, 5),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 108.00, 100, 4000, 5),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 112.00, 150, 6000, 5)
ON CONFLICT (vendor_id, product_id) DO NOTHING;

-- Vendor 2 (Kailash Metals) → metal products
INSERT INTO vendor_products (product_id, vendor_id, price, moq, stock_quantity, commision_percentage) VALUES
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', 340.00,  50, 2000, 4),
  ('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000002', 290.00,  60, 3000, 4),
  ('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 520.00,  30, 1500, 4)
ON CONFLICT (vendor_id, product_id) DO NOTHING;

-- Vendor 3 (Venkat Industrial) → mixed
INSERT INTO vendor_products (product_id, vendor_id, price, moq, stock_quantity, commision_percentage) VALUES
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003',  95.00, 120, 8000, 5),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 155.00,  80, 3500, 5),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000003', 245.00,  70, 4000, 4)
ON CONFLICT (vendor_id, product_id) DO NOTHING;

-- Vendor 4 (Om Sai Steels) → metal + plastic
INSERT INTO vendor_products (product_id, vendor_id, price, moq, stock_quantity, commision_percentage) VALUES
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000004', 410.00,  40, 2500, 4),
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000004', 610.00,  25, 1200, 5),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000004',  88.00, 200, 9000, 5)
ON CONFLICT (vendor_id, product_id) DO NOTHING;

-- ============================================================
-- Done. Verify with:
--   SELECT COUNT(*) FROM products;           -- should be 12
--   SELECT COUNT(*) FROM vendor_products;    -- should be 12
--   SELECT COUNT(*) FROM products_images;    -- should be 12
-- ============================================================
