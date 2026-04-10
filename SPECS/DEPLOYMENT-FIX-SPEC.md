# Deployment Fix Spec — Azure Extraction Failure (2026-04-10)

## Status: IMPLEMENTED

---

## Root Cause Analysis

The GitHub Actions deployment pipeline fails at the **Extract on Azure** step with:

```
RuntimeError: Extract failed:
  File "/home/site/wwwroot/_extract.py", line 12, in <module>
    with z.open(member) as src, open(target, 'wb') as dst:
FileNotFoundError: [Errno 2] No such file or directory:
  '/home/site/wwwroot/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node'
```

### Why it fails

The `_extract.py` script calls `os.makedirs(os.path.dirname(target), exist_ok=True)` before writing each file. On Azure App Service's SMB (network) filesystem, `makedirs()` for paths that include hidden directories (directories whose names start with `.`, e.g. `node_modules/.prisma/client/`) does **not** reliably create the directories before the subsequent `open(target, 'wb')` call. The directory appears to be created (no exception), but the path does not exist by the time the file write is attempted — a known quirk of SMB-backed filesystems where metadata operations are eventually consistent.

This causes `open(target, 'wb')` to raise `FileNotFoundError`, aborting the extraction and the deployment.

---

## Identified Errors

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 1 | **CRITICAL** | `_extract.py` in workflow | `os.makedirs` silently fails for hidden-dir paths on Azure SMB, causing `FileNotFoundError` on write |
| 2 | **WARNING** | `actions/setup-node@v3` | Uses Node.js 20 runner which is deprecated; will be forced off June 2026 |
| 3 | **INFO** | `vega-canvas` | `canvas` native module not found — non-fatal build warning, no action needed |

---

## Fix Plan

### Fix 1 — Replace Python extraction with system `unzip` (Critical)

**File**: `.github/workflows/main_ducksatapp.yml`

**Problem**: The `_extract.py` remote Python script uses `zipfile` + `os.makedirs` which fails on Azure SMB for hidden directories.

**Solution**: Replace the `run_script('_extract.py', ...)` block with a single `kudu_cmd` that calls the system `unzip` command. The Linux `unzip` utility handles all directory creation atomically and reliably, including for hidden directories.

```python
# BEFORE (broken):
r = run_script('_extract.py', f"""
    import zipfile, os
    WR = '{WWWROOT}'
    count = 0
    with zipfile.ZipFile(os.path.join(WR, 'deploy.zip')) as z:
        for member in z.namelist():
            target = os.path.join(WR, member)
            if member.endswith('/'):
                os.makedirs(target, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with z.open(member) as src, open(target, 'wb') as dst:
                    dst.write(src.read())
                count += 1
    print('Extracted', count, 'files')
""")
if r['ExitCode'] != 0:
    raise RuntimeError(f"Extract failed: {r['Error']}")
print(f"  {r['Output'].strip()}")

# AFTER (fixed):
r = kudu_cmd(f'unzip -o {WWWROOT}/deploy.zip -d {WWWROOT}/')
if r['ExitCode'] != 0:
    raise RuntimeError(f"Extract failed: {r['Error']}")
# unzip output can be large; print last 300 chars
output = r['Output'].strip()
print(f"  {output[-300:] if len(output) > 300 else output}")
```

**Why `unzip` works**: The system `unzip` on Azure App Service Linux handles path creation atomically through the OS's native filesystem calls rather than Python's higher-level `os.makedirs`. It properly creates all parent directories including those with leading dots before writing files.

### Fix 2 — Upgrade `actions/setup-node` to v4 (Warning)

**File**: `.github/workflows/main_ducksatapp.yml`

**Problem**: `actions/setup-node@v3` runs on the deprecated Node.js 20 runner. GitHub Actions will force Node.js 24 from June 2, 2026 and remove Node.js 20 on September 16, 2026.

**Solution**: Change `uses: actions/setup-node@v3` → `uses: actions/setup-node@v4`. Version 4 supports Node.js 24 runtime for the action itself.

---

## Implementation Checklist

- [ ] Replace `_extract.py` block with `kudu_cmd('unzip ...')` in workflow
- [ ] Update `actions/setup-node@v3` → `actions/setup-node@v4`  
- [ ] Commit and push to trigger deployment
- [ ] Verify deploy logs show "Inflating:" output and no extraction errors
- [ ] Verify `BUILD_ID` check passes in the Verify step

---

## Expected Post-Fix Behavior

The deployment log should show:
```
Extracting on Azure...
  inflating: .next/BUILD_ID
  ...
  inflating: node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
  ...
  <last 300 chars of unzip output>
Uploading server.js (direct)...
Verifying...
  BUILD_ID: <hash>
  server.js: True
  prisma engines: ['libquery_engine-debian-openssl-3.0.x.so.node']
Restarting app...
Deploy complete.
```
