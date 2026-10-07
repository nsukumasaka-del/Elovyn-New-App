# Complete Guide: Upload Elovyn Theme to Shopify (All Features Visible)

This guide walks you through uploading the theme and configuring it so the **header (logo + navigation)**, **hero**, **press marquee**, **product showcases**, and **footer** all appear with no filters or invisibility.

---

## Part 1: Prepare the Theme for Upload

### Option A: Zip the theme (recommended for first-time upload)

**Critical:** Shopify expects the zip to contain the theme **files and folders at the root**, not a single "theme" folder.

**On Windows (File Explorer):**
1. Open the folder: `c:\cowboy-clone-main\theme`
2. Select **all items inside** the theme folder (layout, sections, assets, config, locales, snippets, templates, data, and any .md files)
3. Right-click → **Send to** → **Compressed (zipped) folder**
4. Name it e.g. `elovyn-theme.zip`

**On Windows (PowerShell):**
```powershell
cd c:\cowboy-clone-main\theme
Compress-Archive -Path * -DestinationPath ..\elovyn-theme.zip
```
Your zip will be at `c:\cowboy-clone-main\elovyn-theme.zip`

**What must be inside the zip (at root level):**
- `layout/`
- `sections/`
- `assets/`
- `config/`
- `locales/`
- `snippets/`
- `templates/`
- `data/` (optional)

**Do not zip the parent folder** so that the zip contains `theme/layout/...`. The zip must contain `layout/`, `sections/`, etc. directly.

---

### Option B: Shopify CLI (for developers)

1. Install [Shopify CLI](https://shopify.dev/docs/themes/tools/cli/install).
2. In a terminal:
   ```bash
   cd c:\cowboy-clone-main\theme
   shopify theme push
   ```
3. Log in to your store when prompted. The theme will upload and appear under **Online Store → Themes**.

---

## Part 2: Upload to Shopify

1. Log in to your **Shopify admin**: `https://your-store.myshopify.com/admin`
2. Go to **Online Store** → **Themes**
3. Click **Add theme** → **Upload zip file**
4. Choose `elovyn-theme.zip`
5. Wait until the status shows **Theme uploaded** (no errors)

If you see "Invalid theme" or errors, the zip structure is wrong. Unzip your file and confirm you see `layout`, `sections`, `assets`, etc. at the top level—not inside a single folder.

---

## Part 3: Publish or Preview the Theme

- **Preview (recommended first):** Click **Actions** → **Preview** on the Elovyn theme. This opens the storefront with this theme without making it live.
- **Publish:** When ready, click **Actions** → **Publish** to make it the live theme.

Use **Preview** first to confirm the header, logo, navigation, and all sections are visible.

---

## Part 4: Ensure Header, Logo & Navigation Are Visible

The **header** (logo + navigation bar) is shown on every page. The navigation bar includes: **Clothes**, **Hair Products**, **Accessories**, **Connect**. Add your logo and set each link URL from **Theme settings → Header**.

### 1. Confirm you’re viewing the right theme

- In **Online Store → Themes**, the theme you uploaded (e.g. "Elovyn" or "Uploaded theme") should be either **Current theme** or the one you open with **Preview**. If you preview/publish a different theme, you won’t see this header.

### 2. Customize the header (optional but recommended)

1. Go to **Online Store** → **Themes**
2. Click **Customize** on the Elovyn theme
3. In the left sidebar, click **Header** (it appears in the layout area at the top) (often under a “Header” or top bar area)
4. Configure:
   - **Logo**: Upload an image, or leave blank to show your store name
   - **Logo alt text**: Optional; leave blank to use store name
   - **Logo link**: Leave blank to link to homepage
   - **Navigation bar**: The 5 links (Clothes, Hair Products, Accessories, Connect) are already set in the theme. You can edit labels and URLs in the “Navigation link” blocks
   - **Book a test ride link**: Optional URL for the CTA button

### 3. If the header still doesn’t appear – diagnose first

**Step A – Check if the header HTML is on the page**

1. Open your storefront (live or **Preview** of the Elovyn theme).
2. Right‑click the page → **View Page Source** (or press `Ctrl+U` / `Cmd+Option+U`).
3. In the source, search for: `elovyn-header-wrap` or `shopify-section-header`.

- **If you find it:** The header is being output; something is hiding it (e.g. CSS or a conflicting theme/app). Try a hard refresh (`Ctrl+F5`), another browser or incognito, and ensure no other theme or app is overriding the header.
- **If you do not find it:** The header section is not being rendered. Then:
  - Confirm you are viewing the **same theme** you uploaded (Preview or Published). If you’re on a different theme, switch to the Elovyn theme and reload.
  - Confirm the zip was built correctly: unzip your upload and check that the **root** of the zip contains `layout/`, `sections/`, `assets/`, etc. (not a single folder like `theme/` that contains those). Re‑zip from inside the `theme` folder so the root of the zip is `layout`, `sections`, `assets`, etc.
  - Re‑upload the theme and use **Preview** again.

**Step B – General checks**

- **Hard refresh:** `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
- **Try another browser or incognito** to rule out cache/extensions
- Confirm the zip contains `sections/header.liquid` and `layout/theme.liquid` (and that you didn’t remove them in the theme editor)

---

## Part 5: Configure the Rest of the Theme (All Features)

### 1. Theme settings (global)

In the theme editor, click **Theme settings** (bottom left):

- **Colors**: Background, foreground, accent (optional)
- **Typography**: Heading and body fonts (optional)
- **Social media**: Instagram, Twitter, Facebook, YouTube (used in footer)
- **Favicon**: Upload a favicon

### 2. Homepage sections

In the theme editor, the **Homepage** template is built from sections. Configure each:

| Section | What to set |
|--------|-------------|
| **Hero** | Hero image, heading, subheading, description, button text/link, and the 3 feature blocks (★, ⚡, 🔒) |
| **Press marquee** | Already has 6 press items; you can edit or add more in “Press Item” blocks |
| **Clothing showcase** | Assign a **Collection** (e.g. “Clothing”); set heading/description and number of products |
| **Hair products showcase** | Assign a **Collection** (e.g. “Hair Products”); set heading/description and number of products |
| **Accessories showcase** | Assign a **Collection** (e.g. “Accessories”); set heading/description and number of products |

If you don’t assign collections, the section will show a message like “Please select a collection in the theme editor.” Assigning collections and adding products ensures the showcases are visible and not empty.

### 3. Collections (so showcases aren’t empty)

1. Go to **Products** → **Collections**
2. Create (or use existing):
   - **Clothing** – add clothing products
   - **Hair Products** – add hair products
   - **Accessories** – add accessories
3. In the theme editor, for each showcase section, open it and choose the matching collection from the **Collection** dropdown.

### 4. Footer

- In the theme editor, open the **Footer** section (inside the footer group)
- Set logo, description, copyright name
- Social links come from **Theme settings** → Social media
- Footer link columns use the default static links unless you add and assign menus in the footer blocks

---

## Part 6: Checklist – No Filters or Invisibility

Use this to confirm everything is visible:

- [ ] **Header bar** visible at the top (logo or store name on the left)
- [ ] **Navigation links** visible on desktop (Clothes, Hair Products, Accessories, Connect)
- [ ] **Account and cart icons** visible in the header
- [ ] **“Book a test ride”** button visible (desktop and/or mobile)
- [ ] **Mobile menu** opens when you tap the hamburger and shows the same 5 links + CTA
- [ ] **Hero** section with image (or background), headline, and “Shop Now” button
- [ ] **Hero feature bar** with the 3 items (e.g. ★, ⚡, 🔒)
- [ ] **Press marquee** strip with press names and quotes
- [ ] **Clothing / Hair / Accessories** sections show products (after you assign collections and add products)
- [ ] **Footer** with logo, description, link columns, and social links

If something is missing, go back to **Part 4** (header) or **Part 5** (sections and collections).

---

## Part 7: Troubleshooting

| Issue | What to do |
|-------|------------|
| Header / logo / nav not showing | Use the theme you uploaded; hard refresh; check that `header-group.json` and `header.liquid` are in the zip and not deleted |
| “Invalid theme” on upload | Zip must contain `layout/`, `sections/`, `assets/`, etc. at root—not inside a single “theme” folder |
| Blank or broken layout | Re-upload the zip; don’t remove `layout/theme.liquid` or the `sections/` group files |
| Product sections empty | Create collections, add products, then assign each collection in the theme editor to the right showcase section |
| Mobile menu not opening | Ensure `assets/global.js` and the header’s inline script are present; test in a different browser/device |
| Styles look wrong | Ensure `assets/base.css` and `assets/theme.css` are in the zip and not deleted |

---

## Part 8: Quick Reference – Theme Structure

```
theme/
├── layout/
│   └── theme.liquid          ← Loads header-group and footer-group
├── sections/
│   ├── header-group.json     ← Defines header section (logo + nav)
│   ├── header.liquid         ← Header: logo, nav bar, icons, mobile menu
│   ├── footer-group.json
│   ├── footer.liquid
│   ├── hero.liquid
│   ├── press-marquee.liquid
│   ├── clothing-showcase.liquid
│   ├── hair-products-showcase.liquid
│   └── accessories-showcase.liquid
├── snippets/
│   ├── icon-user.liquid
│   ├── icon-shopping-bag.liquid
│   ├── icon-menu.liquid
│   ├── icon-x.liquid
│   └── meta-tags.liquid
├── assets/
│   ├── base.css
│   ├── theme.css
│   └── global.js
├── config/
│   └── settings_schema.json
├── locales/
│   └── en.default.json
├── templates/
│   └── index.json            ← Homepage sections and order
└── data/                     ← Optional product data
```

Do not remove `header-group.json`, `header.liquid`, or the `{% sections 'header-group' %}` call in `layout/theme.liquid` if you want the header (and all its features) to appear with no filters or invisibility.

---

## Summary

1. Zip the **contents** of the `theme` folder (not the folder itself).
2. Upload the zip via **Online Store → Themes → Add theme → Upload zip file**.
3. Use **Preview** or **Publish** so you’re viewing this theme.
4. In **Customize**, set logo and navigation (and optionally collections, hero image, footer).
5. Create collections and assign them to the three product showcases so those sections show products.
6. Use the checklist and troubleshooting section to ensure all features are visible with no filters or invisibility.

Following this guide, your Elovyn theme can be uploaded to Shopify and configured so all features, including the header (logo + navigation), appear correctly.
