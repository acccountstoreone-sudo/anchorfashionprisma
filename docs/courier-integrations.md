# Courier Integrations & 3PL Logistics Architecture

Anchor Fashion Enterprise E-commerce platform features a unified, modular, and extensible logistics engine supporting **Pathao Courier**, **Steadfast Courier**, and future logistics providers.

---

## 1. Architecture Overview

The courier engine lives under `lib/couriers/` and follows the Factory and Provider patterns:

```
lib/couriers/
├── types.ts                 # Domain contracts & payload types
├── errors.ts                # Strongly-typed error hierarchy
├── logger.ts                # Sanitized database request/response logger
├── courier.interface.ts     # Standard CourierProvider contract
├── courier.factory.ts       # Provider resolver & database loader
├── pathao/                  # Official Pathao Aladdin API Provider
│   ├── client.ts            # HTTP client with retry & exponential backoff
│   ├── auth.ts              # OAuth2 token manager with auto-refresh
│   ├── orders.ts            # Consignment creation & cancellation
│   ├── tracking.ts          # Milestone event fetching & rate calculator
│   ├── webhook.ts           # Webhook payload parser
│   ├── mapper.ts            # Status mapping to ShipmentStatus
│   └── index.ts             # PathaoCourierProvider implementation
└── steadfast/               # Official Steadfast Packzy API Provider
    ├── client.ts            # Authenticated HTTP client with retry
    ├── orders.ts            # Order creation & cancellation
    ├── tracking.ts          # Tracking query & balance inquiry
    ├── webhook.ts           # Webhook payload parser
    ├── mapper.ts            # Status mapping to ShipmentStatus
    └── index.ts             # SteadfastCourierProvider implementation
```

---

## 2. Database Structure

Logistics data is managed in Supabase PostgreSQL:

- `courier_providers`: Courier configuration, active flag, sandbox toggle, priority, and credentials.
- `shipments`: Core consignment records linking to `orders`, tracking codes, COD amounts, and shipping statuses.
- `shipment_tracking_events`: Chronological history of carrier status milestones.
- `courier_api_logs`: Audit trail of all outbound API requests, latency in ms, status codes, and sanitized responses.
- `courier_webhook_events`: Inbound webhooks logged with an idempotency lock to prevent duplicate event processing.
- `cod_settlements`: Courier balance reconciliation batches.

---

## 3. Environment Variables

Store secrets in `.env.local` or host environment variables:

```bash
# Pathao Credentials
PATHAO_BASE_URL=https://courier-api-sandbox.pathao.com
PATHAO_CLIENT_ID=
PATHAO_CLIENT_SECRET=
PATHAO_USERNAME=
PATHAO_PASSWORD=
PATHAO_STORE_ID=

# Steadfast Credentials
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
STEADFAST_API_KEY=
STEADFAST_SECRET_KEY=

# Courier Credential Encryption (AES-256-GCM)
COURIER_ENCRYPTION_KEY=
ENCRYPTION_KEY=
```

---

## 4. Pathao Courier Setup

1. **Merchant Portal**: Register at [Pathao Courier Merchant Portal](https://merchant.pathao.com).
2. **Obtain API Keys**:
   - Client ID & Client Secret from Developer Settings.
   - Merchant Account Username & Password.
   - Pickup Store ID.
3. **Configure in Admin**:
   - Go to `Admin -> Shipping -> Couriers`.
   - Click **Configure Settings** on the Pathao card.
   - Enter credentials (automatically encrypted with AES-256-GCM).
   - Click **Test Connection** to verify latency and token acquisition.

---

## 5. Steadfast Courier Setup

1. **Merchant Portal**: Register at [Steadfast Courier Portal](https://portal.packzy.com).
2. **Obtain API Keys**:
   - Retrieve `Api-Key` and `Secret-Key` from the API Settings tab.
3. **Configure in Admin**:
   - Click **Configure Settings** on the Steadfast card.
   - Enter `API Key` and `Secret Key`.
   - Click **Test Connection** (pings `/get_balance` to ensure credentials are valid).

---

## 6. Sandbox vs Production

Each courier card in the Admin UI features an **Environment Switcher**:
- **Sandbox Mode**: Routes to sandbox endpoints (e.g. `courier-api-sandbox.pathao.com`). Safe for testing test orders without triggering real dispatches or courier fees.
- **Production Mode**: Routes to live endpoints (e.g. `api-hermes.pathao.com`). Dispatches real couriers to merchant pickup addresses.

---

## 7. Webhook Configuration

Endpoints for automated delivery status callbacks:

- **Pathao**: `POST https://yourdomain.com/api/webhooks/pathao`
- **Steadfast**: `POST https://yourdomain.com/api/webhooks/steadfast`

### Webhook Features:
- **Idempotency**: Every event is verified against `courier_webhook_events`. Duplicates are acknowledged without re-processing.
- **Order Synchronization**: When a webhook reports `delivered`, the corresponding `shipments` row and parent `orders` record are updated automatically.

---

## 8. Shipment Creation Flow

1. Admin clicks **Dispatch Order** or triggers `POST /api/admin/shipments`.
2. System checks eligibility (order must not be cancelled, must have valid phone and delivery address).
3. System verifies no active shipment exists for the order (idempotency).
4. `CourierFactory` loads the active courier provider and decrypts credentials server-side.
5. Provider calls the courier's official order creation endpoint with exponential backoff on transient network errors.
6. System saves consignment ID and tracking number to `shipments`, records the first milestone in `shipment_tracking_events`, and logs the API call to `courier_api_logs`.

---

## 9. Tracking Flow

1. **Admin Tracking**: `GET /api/admin/shipments/:shipmentId/tracking` returns chronological events.
2. **Live Sync**: Adding `?sync=true` prompts the provider to fetch real-time milestone events directly from the courier and reconcile the database.
3. **Scheduled Sync**: A cron job (`GET /api/cron/courier-sync` with `CRON_SECRET`) synchronizes active in-transit shipments in batches.

---

## 10. COD Settlement Flow

- Delivered COD shipments are aggregated under **Pending COD** on each courier's card.
- Providers supporting balance retrieval (such as Steadfast's `/get_balance`) reconcile settled amounts automatically.

---

## 11. Security Implementation

- **AES-256-GCM Encryption**: All credentials stored in `courier_providers.credentials` are encrypted at rest with an authentication tag.
- **Credential Masking**: Client responses always return masked values (`••••••••9X21`), preventing secrets from leaking to browser consoles or dev tools.
- **Sanitized Logging**: All outbound request bodies and responses logged to `courier_api_logs` strip `password`, `secret_key`, `api_key`, and auth tokens.
- **RBAC**: Administrative shipment dispatch and credential management require authenticated staff/admin roles.

---

## 12. Adding a New Courier Provider

To add a new provider (e.g., `RedX`, `Paperfly`, `CarryBee`):

1. **Create Provider Directory**: `lib/couriers/<provider_name>/`.
2. **Implement `CourierProvider`**: Implement `isConfigured()`, `healthCheck()`, `createShipment()`, `getTracking()`, and `cancelShipment()`.
3. **Register in Factory**: Add the provider switch case in `lib/couriers/courier.factory.ts`.
4. **Insert Provider Record**: Add an entry into `courier_providers` table with the provider's `code` and `display_name`.
5. **Add Webhook Route** (if provider supports webhooks): `app/api/webhooks/<provider_name>/route.ts`.

Core order and fulfillment logic in `ShipmentService` remains completely unchanged.
