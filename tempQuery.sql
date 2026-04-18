-- Get ALL Products : 
        const query = `
           SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,
                p.specifications,
                pImg.image_url,
                vp.price,
                vp.moq,
                vp.stock_quantity,
                v.id AS vendor_id,
                v.name AS vendor_name,
                v.company_name
            FROM (
                SELECT *
                FROM products
                LIMIT 20 OFFSET $1
            ) p
            LEFT JOIN product_images pImg ON p.id = pImg.product_id
            LEFT JOIN vendor_products vp ON p.id = vp.product_id
            LEFT JOIN vendors v ON vp.vendor_id = v.id;
        `;


--Product by category : 
const query = `
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,

                -- Primary image
                pImg.image_url AS primary_image,

                -- Vendor count
                COALESCE(vc.vendor_count, 0) AS vendor_count

                FROM (
                    SELECT *
                    FROM products
                    WHERE category = $1
                    LIMIT 20 OFFSET $2
                ) p

                -- Primary image (fast & no duplication)
                LEFT JOIN product_images pImg 
                    ON p.id = pImg.product_id 
                    AND pImg.is_primary = true

                -- Vendor count (pre-aggregated)
                LEFT JOIN (
                    SELECT product_id, COUNT(DISTINCT vendor_id) AS vendor_count
                    FROM vendor_products
                    GROUP BY product_id
                ) vc ON p.id = vc.product_id;
        `;

--Product by name :
      const query = `
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,
                pImg.image_url AS primary_image,
                COALESCE(vc.vendor_count, 0) AS vendor_count
            FROM (
                SELECT id, name, description, category, product_type
                FROM products
                WHERE name ILIKE $1
                LIMIT 20 OFFSET $2
            ) p
            LEFT JOIN product_images pImg 
                ON p.id = pImg.product_id 
                AND pImg.is_primary = true
            LEFT JOIN (
                SELECT product_id, COUNT(DISTINCT vendor_id) AS vendor_count
                FROM vendor_products
                GROUP BY product_id
            ) vc ON p.id = vc.product_id;
        `;