-- Migrate data from products to inventory
INSERT INTO inventory (id, name, stock_quantity, price)
SELECT id, name, stock, price 
FROM products;

-- Verify migration (optional manual check, but good for logs)
-- SELECT count(*) FROM inventory;

-- Drop the old table
DROP TABLE products;
