# Pushing Your Theme to GitHub

## Fix: "error: failed to push some refs"

This usually means the **remote has commits you don't have** (e.g. README or .gitignore added on GitHub). Fix it by pulling first, then pushing.

**Step 1 – Point origin at the right repo (if you use ELOVYN-THEME):**

```powershell
cd c:\cowboy-clone-main
git remote set-url origin https://github.com/nsukumasaka-del/ELOVYN-THEME.git
git remote -v
```

**Step 2 – Pull from the remote, then push:**

```powershell
git pull origin master --rebase
git push -u origin master
```

If your default branch on GitHub is **main** (not master):

```powershell
git pull origin main --rebase
git push -u origin main
```

If you get **"Permission denied"** or **"Support for password authentication was removed"**, use a [Personal Access Token](https://github.com/settings/tokens) as the password when Git asks—not your GitHub account password.

---

## 1. Add and commit your theme (if you haven't)

Your `theme/` folder is currently **untracked**. To include it:

```powershell
cd c:\cowboy-clone-main
git add theme/
git add -A
git status
git commit -m "Add Shopify theme (header, hero, sections, footer)"
```

## 2. Push to GitHub

```powershell
git push -u origin master
```

If your default branch is `main` instead of `master`:

```powershell
git push -u origin main
```

---

## Common errors and fixes

### “Support for password authentication was removed”

GitHub no longer accepts account passwords for `git push`. Use either:

**Option A – Personal Access Token (HTTPS)**  
1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**  
2. **Generate new token**, enable scope **repo**  
3. Copy the token  
4. When you run `git push`, use the **token** as the password (username = your GitHub username)

**Option B – SSH**  
1. Generate a key: `ssh-keygen -t ed25519 -C "your_email@example.com"`  
2. Add the public key to GitHub: **Settings** → **SSH and GPG keys** → **New SSH key**  
3. Change remote to SSH:
   ```powershell
   git remote set-url origin git@github.com:nsukumasaka-del/ELOVYN.git
   git push -u origin master
   ```

---

### “Permission denied” or “Access denied”

- You don’t have write access to `nsukumasaka-del/ELOVYN`.  
- Fix: Get access from the repo owner, or push to a repo you own and update the remote:
  ```powershell
  git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  ```

---

### “Updates were rejected” / “non-fast-forward”

Someone else pushed to the same branch. Pull first, then push:

```powershell
git pull origin master --rebase
git push origin master
```

(Use `main` instead of `master` if that’s your default branch.)

---

### “Nothing to push” / “Everything up-to-date”

- Your last commit is already on GitHub.  
- If you added new files (e.g. `theme/`), run `git add theme/` and `git commit -m "..."` before pushing again.

---

## Quick checklist

1. `git add theme/` (and any other new/changed files)  
2. `git commit -m "Your message"`  
3. `git push -u origin master` (or `main`)  
4. If push asks for a password, use a **Personal Access Token**, not your GitHub account password  

If you paste the **exact error message** you see when running `git push`, the fix can be narrowed down precisely.
