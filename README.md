# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

---

## 🌶️ ChillyFlakes Vendor / Seller Platform

### 1. Running the Application Locally

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Run TypeScript type check and build
npm run build

# Run Oxlint
npm run lint
```

The application will be accessible at `http://localhost:5173/`.
- **Marketplace Landing Page:** `http://localhost:5173/`
- **Vendor Registration:** `http://localhost:5173/vendor/register` (or click "Become a Seller" in the announcement bar)
- **Vendor Login Placeholder:** `http://localhost:5173/vendor/login`
- **OTP Verification Placeholder:** `http://localhost:5173/vendor/verify-otp`

### 2. Mock API (MSW) Configuration

The application uses **Mock Service Worker (MSW)** to mock backend endpoints during frontend development without requiring the Node.js backend to be running.

MSW runs **only in development mode** (`import.meta.env.DEV === true`) and is dynamically imported so that mocks are **never bundled into the production build**.

#### Toggling Mocks via `.env`:
In `.env`:
```env
# Enable mocks (default in development)
VITE_USE_MOCKS=true

# Disable mocks to connect to the live Node.js backend
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:4000/api
```

#### Test Scenarios in Mock Mode:
- **Success (201 Created):** Submit with any unique email and 10-digit mobile (e.g. `9876543210`). Demonstrates the loading spinner and redirects to `/vendor/verify-otp`.
- **Duplicate Email (400 Bad Request):** Use email `taken@test.com` to test server field error mapping for `email`.
- **Duplicate Mobile (400 Bad Request):** Use mobile `9999999999` to test server field error mapping for `mobile`.

### 3. Internationalization (i18n)
Supports 5 Indian languages:
- **English (`en`)**
- **Malayalam (`ml`)** — മലയാളം
- **Tamil (`ta`)** — தமிழ்
- **Hindi (`hi`)** — हिन्दी
- **Kannada (`kn`)** — ಕನ್ನಡ

Selected language is persisted in `localStorage` (language code only) and automatically syncs with the `lang` attribute on the root `<html>` tag. Regional scripts use Google Noto Sans font families.

### 4. 🎪 Demo Mode (Client Presentation Without Backend)

Demo Mode enables a full walkthrough of the vendor portal with realistic Indian handmade marketplace data without requiring a running backend.

#### How to Enable Demo Mode:
```bash
# Option A: Run directly with the flag
VITE_DEMO_MODE=true npm run dev

# Option B: Copy .env.demo to .env
cp .env.demo .env
npm run dev
```

#### Demo Accounts Available:
| Account | Email | Password | Role / Status | Landing Page |
|---|---|---|---|---|
| **Approved Seller** (Recommended) | `approved@test.com` | `Test@123` | Active Seller (`approved`) | `/vendor/dashboard` (Full features) |
| **New Seller (Incomplete)** | `new@test.com` | `Test@123` | Incomplete (`onboarding_incomplete`) | `/vendor/onboarding` (Multi-step wizard) |
| **Under Review** | `review@test.com` | `Test@123` | Under Review (`under_review`) | `/vendor/status` |
| **Rejected** | `rejected@test.com` | `Test@123` | Application Rejected (`rejected`) | `/vendor/status` |
| **Suspended** | `suspended@test.com` | `Test@123` | Suspended Account (`suspended`) | `/vendor/status` |

#### How to Switch Off Demo Mode:
Remove or set `VITE_DEMO_MODE=false` in your `.env` file and restart the dev server.

> [!WARNING]
> **Production Deployment Warning:** Never set `VITE_DEMO_MODE=true` on a live production deployment. Any demo build with public credentials must only be hosted on a private or password-protected preview link. In standard production builds (`VITE_DEMO_MODE=false`), all demo handlers, mock data, and demo credentials are automatically tree-shaken and excluded from the JavaScript bundle.
# chillyflakes_
