# Step-by-Step: Push Your Theme Code to GitHub

Use this guide to push your Shopify theme (and the rest of your project) from your computer to GitHub.

---

## Before you start

- **Where to run commands:** Always run them from the **project root**  
  `c:\cowboy-clone-main`  
  Not from inside the `theme` folder.

- **Terminal:** Use **PowerShell** or **Command Prompt** (Windows).

---

## Step 1: Open terminal and go to the project root

```powershell
cd c:\cowboy-clone-main
```

---

## Step 2: See what’s changed (optional)

```powershell
git status
```

You’ll see untracked or modified files (e.g. `theme/`, config, layout, snippets). Those are what you’ll add and push.

---

## Step 3: Add your theme and any other changes

Add everything you want to push:

```powershell
git add theme/
```

To add all other changed files too:

```powershell
git add -A
```

Check again:

```powershell
git status
```

You should see files listed under “Changes to be committed”.

---

## Step 4: Commit with a message

```powershell
git commit -m "Add Shopify theme (header, nav, logo, sections)"
```

Use any short message you like, e.g.  
`"Update theme header and navigation"`  
or  
`"Add theme and push to GitHub"`.

---

## Step 5: Choose which GitHub repo to push to

**See your current remote:**

```powershell
git remote -v
```

You’ll see something like:

- `origin  https://github.com/nsukumasaka-del/ELOVYN.git`  
  or  
- `origin  https://github.com/nsukumasaka-del/ELOVYN-THEME.git`

**Push to that repo (Step 6).**

**To use a different repo** (e.g. switch to ELOVYN-THEME):

```powershell
git remote set-url origin https://github.com/nsukumasaka-del/ELOVYN-THEME.git
git remote -v
```

Then push in Step 6.

---

## Step 6: Push to GitHub

**If your branch is `main`** (usual case):

```powershell
git push -u origin main
```

**If your branch is `master`:**

```powershell
git push -u origin master
```

**If Git says the remote has new commits** (e.g. “updates were rejected”):

```powershell
git pull origin main --rebase
git push -u origin main
```

(Use `master` instead of `main` if that’s your branch name.)

---

## Step 7: When Git asks for your password

GitHub no longer accepts your normal account password for `git push`. Use a **Personal Access Token** as the password.

1. Open: **https://github.com/settings/tokens**
2. Click **“Generate new token”** → **“Generate new token (classic)”**
3. Name it (e.g. “Push theme”).
4. Choose an expiry (e.g. 90 days or No expiration).
5. Under **Scopes**, check **repo**.
6. Click **“Generate token”** and **copy the token** (you won’t see it again).
7. When Git asks for a password, **paste the token** (not your GitHub password).
8. **Username:** your GitHub username (e.g. `nsukumasaka-del`).

---

## Quick checklist

| Step | Command |
|------|--------|
| 1. Go to project root | `cd c:\cowboy-clone-main` |
| 2. Add theme | `git add theme/` (or `git add -A`) |
| 3. Commit | `git commit -m "Add Shopify theme"` |
| 4. (Optional) Change remote | `git remote set-url origin https://github.com/nsukumasaka-del/ELOVYN-THEME.git` |
| 5. Push | `git push -u origin main` |
| 6. Password | Paste your **Personal Access Token** when asked |

---

## Common errors and fixes

| Error | What to do |
|-------|------------|
| **“remote origin already exists”** | You don’t need to add origin again. To change repo: `git remote set-url origin https://github.com/.../REPO.git` then push. |
| **“Support for password authentication was removed”** | Use a **Personal Access Token** as the password (see Step 7). |
| **“Permission denied” / “Access denied”** | You don’t have write access to that repo. Use a repo you own or get access from the owner. |
| **“Updates were rejected” / “non-fast-forward”** | Run: `git pull origin main --rebase` then `git push -u origin main`. |
| **“Nothing to push” / “Everything up-to-date”** | Your last commit is already on GitHub. If you have new changes, run `git add ...` and `git commit` again, then push. |

---

## One-shot copy-paste (after you’re in the project root)

If you’ve already opened terminal and run `cd c:\cowboy-clone-main`, you can run:

```powershell
git add theme/
git add -A
git status
git commit -m "Add Shopify theme (header, nav, logo, sections)"
git push -u origin main
```

When Git asks for a password, paste your **Personal Access Token**.

---

If a command fails, copy the **full error message** and share it so we can fix the next step.
