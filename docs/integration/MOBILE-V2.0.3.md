# Mobile usability update

## Problems reproduced

Before the patch, mobile form controls rendered at 13–14px, translated category
names were clipped, and the bottom dock lacked an accessible current-page marker.
The existing body padding was also smaller than the narrow-screen dock. The
mobile regression suite failed against the previous public build before fixes.

## Changes

- Readable 16px form text on phone/tablet widths; browser zoom remains enabled.
- Category tiles stack their icon and text and wrap complete labels through
  1023px, including English, Hindi and Kannada in phone landscape.
- Dock destinations share available width, have at least 44px touch targets and
  expose the current page. Additional bottom padding leaves the footer reachable.
- Safe-area spacing accounts for phone notches and home indicators. Scroll
  spacing helps keep focused fields clear of fixed navigation.
- The native menu dialog scrolls at short landscape heights, contains scroll
  chaining and retains its native focus/keyboard behavior.
- The local Next.js development badge is disabled so it cannot intercept touch
  tests; production did not include this development-only badge.

## Reproducing the browser checks

Start a populated local API and the frontend at port 3005 with matching exact
CORS origins, or set `MOBILE_BASE_URL` to the HTTPS public website. From `apps/web`:

```powershell
npx playwright install chromium webkit
npx playwright test --config playwright.mobile.config.ts --reporter=line
```

The suite covers 320×640 Chromium, Pixel 7 Chromium (412×839), iPhone 13 WebKit
(390×664 viewport), and iPhone landscape Chromium (750×342 viewport). Actual
device descriptors in the checked Playwright version are authoritative.
Checks exercise touch search, scheme details, saved checklist persistence,
translated labels, form sizing, dock targets/clearance and drawer navigation.

Browser emulation does not certify every physical phone, OS keyboard or real
microphone. Free Render startup latency and the unverified dataset limitations
from v2.0.2 remain applicable. Hosted results are recorded in deployment-state.json.

Before deployment, all 20 mobile browser checks passed against the populated
local API, including iPhone WebKit. All 13 integration/accessibility regressions
also passed; 52 frontend unit checks passed (five optional checks skipped).
