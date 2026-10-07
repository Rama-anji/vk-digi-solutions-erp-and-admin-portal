# VKD branding and readability

Updated the portal title, login, sidebar, account badge and resource labels to VKD / VK Digi Solutions. Simplified page headings, removed redundant descriptions and database terminology, and corrected obsolete mock-email labels. Client and vendor records and saved company settings were preserved.

Typography uses Segoe UI with local sans-serif fallbacks. Small 10–11px labels now render at 12px, secondary text is darker, headings use a consistent weight, and orange actions use stronger contrast. Existing responsive navigation and local table scrolling remain in place.

Validation: production build and TypeScript checks passed. All 16 main pages passed overflow checks at 320, 390, 768, 1024, 1280, 1440 and 1920px. Production navigation and private-file protection checks passed. Screenshots are in `test-results/responsive`.

The dashboard now labels its total client count correctly and no longer claims every client is active. No database migration was needed for this presentation update.
