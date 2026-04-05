# Layout JSON CLI

**Last updated:** 2026-03

Programmatic read/write for the same **layout JSON** the app uses (export/download from the UI, or files you keep in version control). Runs in Node via **`tsx`** (dev dependency).

**Scope:** local files only. It does **not** call Supabase; cloud sync remains sign-in + browser/API.

## Run

From the `wedding-planner` directory:

```bash
npm run cli -- <command> [arguments]
```

The `--` is required so npm forwards arguments to the script.

## Commands

| Command | Description |
|--------|-------------|
| `validate <file.json>` | Parse and normalize; exit `0` if OK, `1` on error. Prints `OK` to stderr. |
| `info <file.json>` | Human-readable summary: ids, venue size, counts, shapes grouped by `kind`. |
| `normalize <file.json> [-o out.json]` | Parse, normalize (`constraints`, shape layers), pretty-print JSON. Default output: **stdout**. |
| `export <file.json>` | Same as normalize to stdout (full layout). |
| `apply <layout.json> <patch.json> [-o out.json]` | **Shallow merge:** top-level keys from `patch.json` overwrite the layout; `updatedAt` is refreshed. Default output: stdout. |
| `get <file.json> <dot.path>` | Print JSON for one path, e.g. `venueName`, `guests`, `guests.0.name`. |

### Stdin

Use **`-`** as the file path to read JSON from **stdin** (works for `validate`, `info`, `normalize`, `export`, `apply` layout side, `get`).

### Output file

`-o path` or `--out path` writes to a file instead of stdout. Omit `-o` to pipe or redirect.

## Examples

```bash
# Check a file exported from the app
npm run cli -- validate ./my-layout.json

# Summary
npm run cli -- info ./my-layout.json

# Pretty-print normalized layout
npm run cli -- normalize ./my-layout.json -o ./my-layout.clean.json

# Change venue title only (patch is a small JSON object)
echo {"venueName":"River Hall"} > patch.json
npm run cli -- apply ./my-layout.json ./patch.json -o ./my-layout.json
```

On **Windows PowerShell**, avoid `echo {...}` for JSON — it may write UTF-16 and break `JSON.parse`. Prefer:

```powershell
node -e "require('fs').writeFileSync('patch.json', JSON.stringify({venueName:'River Hall'}), 'utf8')"
```

Or save the patch in an editor as **UTF-8**.

```bash
# Read one field
npm run cli -- get ./my-layout.json venueName

# Pipe layout in
type my-layout.json | npm run cli -- validate -
```

## How `apply` works

- The patch must be a **JSON object** (not an array).
- Merge is **shallow** at the root: `{ ...layout, ...patch }`, then `normalizeLayout()` from `src/lib/constraints.ts`.
- To replace **guests** or **shapes** entirely, include the full array in the patch. Omitting a key leaves the previous value (except that `updatedAt` is always updated after merge).

## Code API (Node / scripts)

Same logic as the CLI:

- `parseLayoutFromJsonText` — string → `Layout`
- `mergeLayoutPatch` — `(base: Layout, patch: Record<string, unknown>) => Layout`
- `getAtPath` — dot path into any object

**Module:** `src/lib/layoutMerge.ts`

## Related

- Types: `src/types/index.ts` (`Layout`, `Guest`, `VenueShape`, …)
- Normalization: `normalizeLayout` in `src/lib/constraints.ts`
