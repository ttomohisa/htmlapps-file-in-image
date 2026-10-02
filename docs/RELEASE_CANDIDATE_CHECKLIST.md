# File in Image v0.9.0 Release Candidate Checklist

Complete these checks in real browsers/devices before v1.0.0.

## 1. Target environments

- [ ] Windows / current Chrome
- [ ] Windows / current Edge
- [ ] Windows / current Firefox
- [ ] macOS / current Safari
- [ ] Android / current Chrome
- [ ] iPhone / current Safari

Switch between Japanese and English at least once in each major environment.

## 2. Launch modes

- [ ] Run `dist/index.html` over HTTP
- [ ] Open the single HTML directly with `file://`
- [ ] Open `dist/index.self-extract.html`
- [ ] Browser favicon and top-left app icon match
- [ ] No unnecessary runtime network request

## 3. Embed basics

- [ ] PNG carrier
- [ ] JPEG carrier
- [ ] WebP carrier
- [ ] Selected-file drop zone becomes compact
- [ ] Compact state still accepts Drag & Drop replacement
- [ ] Change button still works
- [ ] Long Japanese filename does not break layout
- [ ] Long English filename does not break layout
- [ ] Capacity failure is clear
- [ ] Payload over 32 MiB is rejected

## 4. Compression

- [ ] Compressible text uses GZIP
- [ ] Already-compressed/random data skips GZIP when it would be larger
- [ ] GZIP output recovers exactly
- [ ] Non-GZIP output recovers exactly

## 5. Password protection

- [ ] Embed/recover without password protection
- [ ] Embed/recover with password protection
- [ ] Password confirmation mismatch is rejected
- [ ] Show/hide button works for password
- [ ] Show/hide button works independently for confirmation
- [ ] Extract password show/hide works
- [ ] Turning protection off resets masking
- [ ] Choosing another encoded PNG resets masking
- [ ] Wrong password fails authentication
- [ ] Correct password restores original filename

## 6. Generated-PNG verification

- [ ] Save stays disabled until verification finishes
- [ ] Save becomes available only after successful recovery verification
- [ ] Saved PNG can be recovered again through Extract
- [ ] SHA-256 matches
- [ ] Filename matches
- [ ] MIME matches
- [ ] Byte length matches

## 7. Format compatibility

- [ ] New v0.9.0 BKFI version 1 output recovers
- [ ] New v0.9.0 BKFC version 1 output recovers
- [ ] Saved legacy mode 0 / version 0 fixture recovers
- [ ] Saved adaptive version 0 fixture recovers
- [ ] Unsupported future version is not interpreted as current data

## 8. Modified/corrupt images

- [ ] Resized generated PNG fails safely
- [ ] JPEG-converted output fails safely
- [ ] Pixel-modified PNG fails authentication/SHA validation
- [ ] Ordinary PNG produces a clear error
- [ ] Corrupt image file produces a clear error

## 9. Cancel / stale results

- [ ] Cancel during Embed Worker
- [ ] Cancel during Extract Worker
- [ ] Old result does not appear after cancel
- [ ] Replacing carrier during processing prevents stale result
- [ ] Replacing payload during processing prevents stale result
- [ ] Password changes during processing prevent stale output becoming saveable

## 10. Mobile / accessibility

- [ ] No horizontal scroll at 360 px
- [ ] No horizontal scroll at 390 px
- [ ] No fixed UI covers content
- [ ] Help dialog stays within viewport
- [ ] Change button remains usable with long filenames
- [ ] Main tap targets are large enough
- [ ] iOS does not unnecessarily zoom password/filename fields
- [ ] Arrow keys switch Embed / Extract tabs
- [ ] Home / End tab behavior works
- [ ] aria-busy / progress state exists while processing
- [ ] Completion focuses the result card

## 11. Save / filenames

- [ ] Output PNG filename is editable
- [ ] Recovered filename is editable
- [ ] Windows-invalid filename characters are sanitized
- [ ] Long filenames are handled safely
- [ ] Japanese filenames save and recover correctly

## 12. Release gate

Before v1.0.0:

- [ ] `scripts/check-repository.ps1` passes
- [ ] `scripts/check-format-regression.mjs` passes
- [ ] GitHub Actions passes
- [ ] Real browser/device checks above are complete
- [ ] Japanese / English README final review
- [ ] favicon / app icon final review
- [ ] PC / smartphone screenshots refreshed
- [ ] English screenshot refreshed
- [ ] standalone / self-extract final review
- [ ] runtime network check final review

If a binary compatibility blocker requires a format change, bump the format version instead of redefining version 1.
