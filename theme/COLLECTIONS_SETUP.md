# Collections Setup Guide

This guide will help you create the collections needed for your theme.

## Required Collections

Create these three collections in your Shopify admin:

### 1. Clothing Collection
- **Name**: Clothing
- **Handle**: `clothing` (auto-generated, but verify)
- **Description**: Premium clothing collection
- **Products**: 4 products (Premium Shirt, Premium Shirt 2, Summer Dress, Casual Hoodie)

### 2. Accessories Collection
- **Name**: Accessories
- **Handle**: `accessories` (auto-generated, but verify)
- **Description**: Premium accessories
- **Products**: 4 products (Premium Lock, Bike Lights Set, Carrying Bag, Phone Holder)

### 3. Hair Products Collection
- **Name**: Hair Products
- **Handle**: `hair-products` (auto-generated, but verify)
- **Description**: Hair care and styling products
- **Products**: 3 products (Bundles, Shampoo, 5‑in‑1 Hair Styling Tool)

## How to Create Collections

1. **Go to Shopify Admin**
   - Navigate to **Products > Collections**

2. **Create New Collection**
   - Click **Create collection**
   - Enter collection name
   - Choose collection type:
     - **Manual**: You manually add products
     - **Automated**: Products are added based on conditions (tags, product type, etc.)

3. **For Manual Collections** (Recommended):
   - Select **Manual** as collection type
   - Add products by searching and selecting them
   - Save collection

4. **For Automated Collections**:
   - Select **Automated** as collection type
   - Set conditions:
     - **Clothing**: Product tag contains "clothing"
     - **Accessories**: Product tag contains "accessories"
     - **Hair Products**: Product tag contains "hair"
   - Save collection

## Collection Settings in Theme

After creating collections, configure them in the theme:

1. Go to **Online Store > Themes > Customize**
2. Click on **Clothing Showcase** section
3. Select "Clothing" from the Collection dropdown
4. Repeat for **Accessories Showcase** and **Hair Products Showcase**

## Collection Handles

The theme sections will automatically look for collections with these handles:
- `clothing` - for Clothing Showcase
- `accessories` - for Accessories Showcase  
- `hair-products` - for Hair Products Showcase

If your collection handles are different, you can still select them manually in the theme customizer.

## Tips

- **Collection Images**: Add a collection image for better presentation
- **Collection Descriptions**: Add SEO-friendly descriptions
- **Product Order**: Drag and drop products in manual collections to control display order
- **Collection Pages**: Each collection will have its own page at `/collections/[handle]`
