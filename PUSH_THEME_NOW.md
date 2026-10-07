# Push Your Theme to GitHub – Run These Commands

---

## Current situation (after your last push)

- **Push succeeded** – but it went to **ELOVYN** (not ELOVYN-THEME), because `origin` was already set to ELOVYN. That’s why you saw “remote origin already exists” when you tried `git remote add origin ... ELOVYN-THEME`.
- **Theme not on GitHub yet** – the `theme/` folder is **staged** but **not committed**. The last push only had the initial “main” branch, so the theme files are still only on your machine.

**Next:** Commit the staged theme, then push again. Run the commands below from **the project root** `c:\cowboy-clone-main` (not from inside `theme`).

---

## Step 1: Go to the project root

```powershell
cd c:\cowboy-clone-main
```

---

## Step 2: Commit the theme (it’s already staged)

```powershell
git commit -m "Add Shopify theme (header, hero, sections, footer)"
```

Optional: add the push guides and commit them too:

```powershell
git add GITHUB_PUSH_GUIDE.md PUSH_THEME_NOW.md
git commit -m "Add GitHub push guides"
```

---

## Step 3: Push to GitHub

**You’re on branch `main` and remote is ELOVYN.** To push the new commits:

```powershell
git push -u origin main
```

**If you want the theme in ELOVYN-THEME instead:** change the remote, then push:

```powershell
git remote set-url origin https://github.com/nsukumasaka-del/ELOVYN-THEME.git
git push -u origin main
```

(That does **not** remove the code from ELOVYN; it only adds the same code to ELOVYN-THEME. To use only ELOVYN-THEME, set the URL and push as above; your local repo will then track ELOVYN-THEME.)

---

## If Git asks for a password

- **Username:** your GitHub username (`nsukumasaka-del`)
- **Password:** use a **Personal Access Token**, not your GitHub account password  
  - Create one: https://github.com/settings/tokens → Generate new token (classic) → check **repo** → copy the token and paste it when Git asks for a password.

---

## If you see "branch 'main' not 'master'"

Use `main` instead of `master`:

```powershell
git pull origin main --rebase
git push -u origin main
```

---

Copy and run the commands in order. If any command fails, copy the full error message and share it.
