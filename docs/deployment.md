# Deployment

CI/CD is handled by GitHub Actions (`.github/workflows/`). Pushing to `main` deploys automatically:

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ui-checks.yml` | Pull Request | Lint + test + build frontend |
| `api-checks.yml` | Pull Request | PHPUnit backend tests |
| `ui-deploy.yml` | Push to `main` | Deploy frontend via SSH/rsync to a VPS, served with PM2 |
| `api-deploy.yml` | Push to `main` | Deploy backend via FTP to shared PHP hosting |
| `sonarcloud.yml` | PRs + push to `main` | SonarCloud quality gate |

- **Frontend** is built as a Next.js standalone app (`output: 'standalone'` in `next.config.js`) and managed by PM2 (`ecosystem.config.js`).
- **Backend** is uploaded as plain PHP to shared hosting.
- Production secrets live in the `server/.env` and `client/.env` files **on the target hosts** — they are not committed. Configure them using the tables in [setup.md](setup.md#configuration) before (or right after) the first deploy. Neither workflow injects them.

## Maintenance Mode

Both deploy workflows show a static "please wait" page (`client/public/maintenance.html`) to visitors for the duration of the file swap, so nobody hits a half-deployed app. The gate lives in nginx (`config/nginx.conf`), which is only manually synced to the VPS — re-copy it there after editing.

Each workflow touches its own lock file on the frontend VPS right before the disruptive step (rsync + PM2 restart for `ui-deploy.yml`; the FTP mirror for `api-deploy.yml`, which reaches the VPS over SSH purely for this) and removes it (`if: always()`) once that step finishes, success or failure. nginx serves the maintenance page whenever **either** lock file exists, so a client-only, API-only, or simultaneous deploy all show the same screen until every job that started has finished. If a run is killed before its cleanup step, clear the stuck lock manually:

```bash
ssh vps "rm -f /var/www/astro.miksoft.pro/.deploy-lock/*.lock"
```

## Database Migrations

Migrations are **not** run automatically by the deploy workflows. After deploying changes that add migrations, run them on the server:

```bash
cd server
composer migration:run     # apply pending migrations
composer migration:status  # verify what has been applied
```

## Payment Acquiring (Alfa-Bank)

Stargazing events can charge a per-event ticket price (set in the event admin form; `0` = free, children under 18 are always free). Payments use Alfa-Bank **single-stage** REST internet acquiring: the API registers an order, the user is redirected to the bank's payment page, and the result is reconciled both by polling and by an asynchronous HMAC-signed callback.

The integration is gateway-agnostic (`PaymentGatewayInterface` → `AlfaBankClient` → `PaymentLibrary` in `server/app/Libraries/`); adding another provider is a single new class.

**1. Set the environment variables** in `server/.env` (full list in [setup.md](setup.md#backend-serverenv)). `payment.alfabank.environment` switches between two independent credential/URL sets — `test.*` (sandbox/UAT) and the bare `payment.alfabank.*` keys (production):

```dotenv
payment.gateway                = 'alfabank'
payment.currency               = '810'        # RUB
payment.sessionTimeoutSecs     = 1200          # how long an unpaid seat is held

payment.alfabank.environment   = 'production'  # or 'test' to use the block below

payment.alfabank.userName      = ''            # API login from the cabinet (ends with -api)
payment.alfabank.password      = ''            # API password
payment.alfabank.token         = ''            # preferred over userName/password when set (required for an "r-login" contract); NOT used by refund.do, which always needs userName/password
payment.alfabank.gatewayUrl    = 'https://payment.alfabank.ru/payment/rest/'
payment.alfabank.callbackToken = ''            # symmetric token (see step 3)

# Sandbox/UAT — same keys, used only when payment.alfabank.environment = 'test'.
# gatewayUrl is Alfa-Bank's public rbsuat sandbox host (test cards, no real
# money); userName/password/token still come from the bank/integrator.
payment.alfabank.test.userName      = ''
payment.alfabank.test.password      = ''
payment.alfabank.test.token         = ''
payment.alfabank.test.gatewayUrl    = 'https://alfa.rbsuat.com/payment/rest/'
payment.alfabank.test.callbackToken = ''

# Must point to the public frontend URL — used to build the payment return URL:
app.siteUrl                    = 'https://astro.miksoft.pro'
```

**2. Get the API credentials.** In the Alfa-Bank merchant cabinet (or from your acquiring integrator, if you're onboarded through one), create/obtain the API user (login usually ends with `-api`) and its password, and put them in `payment.alfabank.userName` / `payment.alfabank.password` (production) or the matching `payment.alfabank.test.*` keys (sandbox — same request, just ask for sandbox/UAT credentials).

**3. Enable signed callbacks.** In the cabinet, set the callback signature type to **Symmetric**, generate the **callback token**, and copy it into `payment.alfabank.callbackToken` (or `payment.alfabank.test.callbackToken` for sandbox). The backend verifies every callback with HMAC-SHA256 and rejects unsigned/forged ones. Without a real, publicly reachable callback URL (e.g. testing from `localhost`), leave this blank — the app still reconciles payments by polling (`/events/payment/status`), just without the async webhook.

**4. Register the callback URL** in the cabinet, pointing to the **backend (API)** host:

```
https://<your-api-host>/events/payment/callback
```

**5. Confirm the return URL.** After payment the bank redirects the user to the **frontend** page below (built automatically from `app.siteUrl`, with the order id appended by the bank). No cabinet setting is required, but the frontend host must be reachable:

```
https://<your-frontend-host>/stargazing/payment
```

**6. Apply migrations** (see [Database Migrations](#database-migrations)) and restart the API.

> Reference: Alfa-Bank REST API — <https://ecom.alfabank.ru/assets/instructions/merchantManual/pages/index/rest.html>
