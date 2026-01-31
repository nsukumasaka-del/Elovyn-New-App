# Products Setup Guide

This guide will help you add products to your Shopify store to match your current site.

## Collections to Create

Create these three collections in Shopify Admin:

1. **Clothing** - Handle: `clothing`
2. **Accessories** - Handle: `accessories`  
3. **Hair Products** - Handle: `hair-products`

## Clothing Products (4 products)

### 1. Premium Shirt
- **Title**: Premium Shirt
- **Vendor**: Comfort & Style
- **Price**: ZAR 443.21
- **Description**: High‑quality cotton‑blend men's T‑shirt with a sleek athletic fit.
- **Image**: Use `Shirt 1.jpg` from your assets
- **Tags**: clothing, shirt, premium, men
- **Purchase Link**: https://amzn.to/4sMHRqW (add as metafield or in description)

### 2. Premium Shirt 2
- **Title**: Premium Shirt 2
- **Vendor**: COMFORT & STYLE
- **Price**: ZAR 427.42
- **Description**: Men's Muscle Fit Textured Polo Shirt – Casual & Stylish.
- **Image**: Use `Shirt 2.jpg` from your assets
- **Tags**: clothing, shirt, polo, men
- **Purchase Link**: https://amzn.to/4pOb8ii

### 3. Summer Dress
- **Title**: Summer Dress
- **Vendor**: Light & Breezy
- **Price**: ZAR 418.59
- **Compare at Price**: ZAR 837.21 (shows 50% off)
- **Description**: Men's Vintage Print Hoodie Jogging Suit – Casual & Sporty
- **Image**: Use `Two Piece.jpg` from your assets
- **Tags**: clothing, jogging suit, hoodie, men
- **Purchase Link**: https://s.click.aliexpress.com/e/_c4SAW5hN

### 4. Casual Hoodie
- **Title**: Casual Hoodie
- **Vendor**: Cozy Essential
- **Price**: ZAR 549.99
- **Description**: Soft and comfortable hoodie ideal for layering. Premium fabric with modern design.
- **Image**: Use `CLOTHING.jpg` from your assets
- **Tags**: clothing, hoodie, casual, men

## Accessories Products (4 products)

### 1. Premium Lock
- **Title**: Premium Lock
- **Vendor**: Maximum Security
- **Price**: ZAR 249.99
- **Description**: Lightweight yet durable lock with smart integration. Keeps your bike secure in any location.
- **Tags**: accessories, lock, security

### 2. Bike Lights Set
- **Title**: Bike Lights Set
- **Vendor**: Safety & Visibility
- **Price**: ZAR 199.99
- **Description**: Integrated front and rear lights with automatic brightness adjustment. USB rechargeable.
- **Tags**: accessories, lights, safety

### 3. Carrying Bag
- **Title**: Carrying Bag
- **Vendor**: Easy Transport
- **Price**: ZAR 299.99
- **Description**: Spacious and durable carrying bag designed for comfortable transport. Weather-resistant material.
- **Tags**: accessories, bag, transport

### 4. Phone Holder
- **Title**: Phone Holder
- **Vendor**: Navigation Ready
- **Price**: ZAR 149.99
- **Description**: Secure phone mount with 360-degree rotation. Compatible with all phone sizes.
- **Tags**: accessories, phone, mount

## Hair Products (3 products)

### 1. Bundles
- **Title**: Bundles
- **Vendor**: Luxury Weave
- **Price**: ZAR 1,969.05
- **Description**: 16A Raw Brazilian Virgin Human Hair Bundles, Body Wave (18–24")
- **Image**: Use `WEAVE 1.jpg` from your assets
- **Tags**: hair, extensions, bundles, weave
- **Purchase Link**: https://amzn.to/4jGX4pm

### 2. Shampoo
- **Title**: Shampoo
- **Vendor**: Hydration Boost
- **Price**: ZAR 339.69
- **Description**: Moisture Renewal Shampoo & Conditioner Set.
- **Image**: Use `Shampoo 1.jpg` from your assets
- **Tags**: hair, shampoo, conditioner, care
- **Purchase Link**: https://amzn.to/4sKmpmB

### 3. 5‑in‑1 Hair Styling Tool
- **Title**: 5‑in‑1 Hair Styling Tool
- **Vendor**: Beyond boundaries
- **Price**: ZAR 1,923.48
- **Description**: MESCOMB 5‑in‑1 Hot Air Styler for drying, curling, and smooth styling.
- **Image**: Use `HAND BAG COMBO.jpg` from your assets
- **Tags**: hair, styling, tool, mescomb
- **Purchase Link**: https://amzn.to/3NqTzYg

## Quick Setup Steps

1. **Create Collections**:
   - Go to Products > Collections
   - Create "Clothing" collection
   - Create "Accessories" collection
   - Create "Hair Products" collection

2. **Add Products**:
   - Go to Products > Add product
   - For each product above:
     - Enter title, description, price
     - Set vendor (this appears as tagline)
     - Upload product image
     - Add to appropriate collection
     - Add tags
     - If product has external purchase link, add it in the description or as a metafield

3. **Upload Images**:
   - Copy images from `src/assets/` to your Shopify product images
   - Recommended: Upload directly when creating each product

4. **Configure Theme**:
   - Go to Online Store > Themes > Customize
   - In Clothing Showcase section, select "Clothing" collection
   - In Accessories Showcase section, select "Accessories" collection
   - In Hair Products Showcase section, select "Hair Products" collection

## Notes

- The **vendor** field is used as the tagline in product cards
- Products with external purchase links can have the link added in the product description or as a metafield
- Make sure product images are high quality (recommended: 1200x1500px)
- Set inventory quantities appropriately
- Enable inventory tracking if needed
