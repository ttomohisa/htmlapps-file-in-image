# File in Image — APP_SPEC.md

## 1. Product identity

- **Name:** File in Image
- **Japanese name:** 画像にファイルを埋め込む
- **Slug:** `file-in-image`
- **Current version:** v0.8.0
- **Repository:** `ttomohisa/htmlapps-file-in-image`
- **Purpose:** Hide one arbitrary file inside image pixels and recover the original bytes later without uploading either file.
- **Release artifacts:** `dist/index.html`, `dist/index.self-extract.html`, and the generated repository-root `file-in-image.html`.

## 2. Scope of v0.8.0

v0.8.0 is a UI / mobile / accessibility polish release. It does **not** change the BKFI/BKFC binary format, cryptography, compression, Worker algorithm, or generated-PNG verification rules.

The release focuses on:

- smartphone tap targets;
- 360 px layout robustness;
- safe-area handling;
- long filenames;
- accessible tabs;
- accessible file selection;
- processing-state announcements;
- result focus and keyboard flow;
- password field descriptions;
- help dialog behavior on small screens.

## 3. Format compatibility

Unchanged from v0.7.0:

- `formatVersion=0`
- legacy `embeddingMode=0`
- current `embeddingMode=1`
- GZIP behavior unchanged
- PBKDF2-HMAC-SHA-256 / AES-256-GCM behavior unchanged
- adaptive 8×8 placement unchanged
- generated-PNG recovery verification unchanged
- v0.2.0–v0.7.0 images remain readable

The stable v1 format is still not frozen.

## 4. Touch targets

Primary interactive controls should provide approximately 44 px minimum touch height where practical.

This includes:

- primary and secondary buttons;
- language switch;
- help / dialog-close icon buttons;
- mode tabs;
- password-protection checkbox label area;
- file-selection buttons.

No fixed bottom UI is introduced in v0.8.0, avoiding content overlap on small screens.

## 5. Mobile layout

At smartphone widths:

- no horizontal page scrolling;
- mode tabs use the full available width;
- password and filename inputs use at least 16 px font size to avoid iOS focus zoom;
- long file names may wrap to two lines instead of becoming unreadable one-line ellipses;
- result/file copy areas retain `min-width: 0`;
- page/footer spacing includes safe-area insets;
- the help dialog remains inside the visible `100dvh` area including safe-area margins.

## 6. File-selection semantics

The v0.7.0 structure used a drop zone with `role="button"` while also containing a nested Change button.

v0.8.0 removes that nested-interactive-control pattern.

- the drop region remains a Drag & Drop target;
- empty state contains an explicit native button that opens the file picker;
- pointer users may still click an empty drop region;
- after a file is selected, only the explicit Change button opens the picker;
- the outer drop region is no longer exposed as a synthetic button.

## 7. Tabs

The Embed / Extract control follows tab semantics:

- `role="tablist"`;
- localized accessible label;
- `role="tab"`;
- roving `tabindex`;
- `aria-selected`;
- `aria-controls`;
- Left / Right Arrow moves between the two tabs;
- Home selects Embed;
- End selects Extract.

Changing mode while an operation is active preserves the existing stale-result/cancellation behavior.

## 8. Processing accessibility

During Embed / Extract:

- the active panel sets `aria-busy="true"`;
- status text uses `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`;
- progress elements have localized accessible labels;
- progress updates set `aria-valuetext` with stage + percentage;
- completed/cleared progress removes stale `aria-valuetext`;
- error boxes remain atomic alerts.

Progress percentages remain informative and are not duration estimates.

## 9. Result focus

After successful Embed/self-verification or Extract:

- reveal the result card;
- focus the result card itself using `tabindex="-1"`;
- allow screen-reader and keyboard users to encounter the summary before deciding whether to save.

This replaces moving focus directly to the Save button.

## 10. Long filenames

File name display must remain usable for long Japanese/English names.

- full names are preserved in `title` attributes;
- carrier/extract thumbnail alt text uses the selected filename;
- smartphone display may wrap names to two lines;
- metadata retains `overflow-wrap:anywhere`;
- recovered original filename retains full value for the editable Save As field.

## 11. Password accessibility

Password fields keep existing visible labels and gain explicit description relationships.

Embed password and confirmation reference:

- the password-protection explanation;
- the live password validation status.

Extract password references the protected-image explanation.

Password persistence/privacy behavior is unchanged.

## 12. Privacy and runtime rules

Unchanged:

- files/passwords stay in browser memory;
- no runtime CDN/API/analytics/telemetry;
- no file/password persistence in localStorage / IndexedDB;
- `connect-src 'none'`;
- Blob Worker allowed through `worker-src 'self' blob:`;
- runtime dependency count remains zero.

## 13. v0.8.0 acceptance criteria

- no nested button inside an element exposed as `role="button"`;
- three explicit empty-state file-picker buttons exist;
- Embed / Extract tabs support click and Arrow/Home/End keyboard navigation;
- inactive tab has `tabindex="-1"`;
- operation panels expose `aria-busy`;
- status/progress has localized accessible text;
- primary touch targets are approximately 44 px high;
- mobile text/password inputs do not trigger iOS small-font zoom;
- long filenames do not create horizontal scrolling at 360 px;
- help dialog respects viewport/safe-area bounds;
- result card receives focus on successful completion;
- existing Worker, crypto, compression, adaptive placement, and self-verification behavior remains unchanged;
- standalone / self-extract checks remain green.

## 14. Roadmap

- **v0.9.0:** release candidate, cross-browser/device regression, format freeze candidate.
- **v1.0.0:** stable release; only RC fixes and release artifacts.
