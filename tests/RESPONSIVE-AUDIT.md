# Responsive UI verification

Implemented and checked on 22 September 2026 using the populated local database and the built XAMPP application.

## Layout changes

- Below 1280px, navigation opens as a backdrop drawer instead of taking space from the page. It supports keyboard focus containment, Escape, focus restoration, automatic closure after navigation, and reduced motion.
- Phones use a two-row header with full-width search. Tablet actions adapt to available space; account and notification panels stay inside the viewport.
- Cards, headings, filters and action groups wrap. Narrow forms stack, quotation fields use wider tablet columns, and mobile controls use 44px minimum heights with 16px input text.
- Invoice and quotation line-item tables scroll within their own panels. HR payslip tables and custom grids retain access to all columns. Wide data tables deliberately use local horizontal scrolling instead of shrinking text or hiding columns.
- Dialogs fit the dynamic viewport height and retain scrollable content. WhatsApp tabs wrap into three equal columns; the source explorer keeps both file navigation and code accessible.
- Existing navy/orange branding, desktop navigation, business data and document generation remain intact.

## Browser coverage

`node tests/responsive.mjs` checks all 16 screens at 320, 390, 768, 1024, 1280, 1440 and 1920px: 112 screen/width combinations. It checks page/main overflow, content outside the viewport and header overlap, allowing intentional local scroll regions. Screenshots cover phone, tablet and desktop.

`node tests/responsive-details.mjs` checks 320×740, 768×1024 and 844×390 landscape: navigation keyboard behavior, account/notification panels, five administration editors, client creation, CSV import, service creation, quotation creation/preview, invoice editing, project/task creation, subscription assignment, renewal outbox, custom table setup/editor, file upload, vendor bills, recurring expense forms, all seven HR templates, WhatsApp and source explorer.

TypeScript and the production build pass. Existing `ui-restoration.mjs` and `production-smoke.mjs` pass. Screenshot and machine-readable results are under `test-results/responsive/`.

These are Chromium viewport checks, including short landscape layouts; physical iOS/Safari and Android device testing was not performed. Existing build output still reports the prior large-bundle advisory.
