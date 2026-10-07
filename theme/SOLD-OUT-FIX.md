# Fix "Sold out" when adding to cart

If customers see **"The product ... is already sold out"** when clicking Add to cart, Shopify is blocking the add because the variant has no stock and is not set to allow backorders.

You need to change this **in Shopify Admin** (the theme cannot override it).

## Option A: Allow selling when out of stock (recommended)

1. In **Shopify Admin**, go to **Products**.
2. Open the product that shows the error (e.g. "Wash and make old hooded sweaters").
3. In the **Variants** section, click the variant (e.g. "Black and gray / M") or scroll to **Inventory**.
4. Under **Inventory**, ensure **Track quantity** is enabled, then check:
   - **Allow customers to purchase this product when it's out of stock**  
     (sometimes labeled **Continue selling when out of stock**)
5. **Save**.

Repeat for every product (or variant) you want to stay purchasable when out of stock.  
Shopify does not offer a single bulk action for this; you do it per product.

## Option B: Stop tracking inventory (always in stock)

If you don't need to track inventory for an item:

1. Go to **Products** → open the product.
2. In **Inventory**, turn **off** **Track quantity** for the variant(s).
3. **Save**.

Then that variant is always treated as available and can be added to cart.

---

After you enable one of the options above for a product, Add to cart for that product will work without the "sold out" error.
