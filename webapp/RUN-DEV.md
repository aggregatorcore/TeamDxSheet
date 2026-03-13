# Run dev server (TeamDX-Sheet webapp)

**Important:** In PowerShell, type or paste **only the commands** below. Do **not** paste error messages or the `PS F:\...>` prompt into the terminal — PowerShell will try to run them as commands and fail.

**Wrong path:** Do NOT use `cd d:\talantflyinternational` — that folder does not exist on this PC.

---

## If you see "react was not found" or "@swc/helpers" / module errors

Your `node_modules` is incomplete or corrupted. Do a **clean install** (run in PowerShell from this folder):

```powershell
cd F:\TeamDX-Sheet\webapp
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

Wait until `npm install` finishes (can take 2–3 minutes). Then:

```powershell
npm run dev
```

---

## Normal run (after dependencies are installed)

1. Open PowerShell or Terminal.
2. Go to webapp folder:
   ```powershell
   cd F:\TeamDX-Sheet\webapp
   ```
3. Start the dev server:
   ```powershell
   npm run dev
   ```

**One-liner:**
```powershell
cd F:\TeamDX-Sheet\webapp; npm run dev
```

---

**Note:** If errors persist with Node.js v24, try Node 20 LTS (e.g. from https://nodejs.org or via nvm).

---

## Copy only the commands (do not paste error text)

**Step 1 — go to folder (press Enter after pasting):**
```
cd F:\TeamDX-Sheet\webapp
```

**Step 2 — clean install (paste this whole block, then press Enter once):**
```
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue; Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue; npm install
```

**Step 3 — when npm install finishes, start dev server:**
```
npm run dev
```
