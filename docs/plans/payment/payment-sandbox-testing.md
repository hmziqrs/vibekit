---
name: Sandbox Testing Guide for Payment Processors
description: Step-by-step sandbox setup and testing procedures for Stripe, Polar, Lemon Squeezy, Paddle, PayPal, Coinbase Commerce, Dodo Payments, Chargebee, and FastSpring
type: project
---

# Payment Processor Sandbox Testing Guide

## Stripe

**Credentials:**

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy publishable key (`pk_test_`) and secret key (`sk_test_`)
3. Add to `.env`: `STRIPE_SECRET_KEY="sk_test_..."`, `STRIPE_PUBLISHABLE_KEY="pk_test_..."`

**Webhook forwarding (local dev):**

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:5173/billing/webhooks/stripe
# Copy "whsec_..." from output to STRIPE_WEBHOOK_SECRET in .env
```

**Test plan creation:**

```bash
# 1. In Stripe dashboard > Products > Add Product
#    - Name: "Pro", Price: $10/month recurring
# 2. Copy the price ID (starts with "price_")

curl -X POST http://localhost:5173/api/billing/plans \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pro","slug":"pro","priceInCents":1000,"interval":"month","stripePriceId":"price_xxx","features":["Feature 1"]}'
```

**Test checkout (browser):**

1. Navigate to /app/settings/billing
2. Click "Subscribe" on the plan
3. Fills in Stripe Checkout with test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. Submit, gets redirected back to success_url
5. Verify subscription shows "active" on billing page
6. Check `stripe_webhook_event` table for processed events

**Test payment failure:**

- Use card `4000 0000 0000 0341` for first payment
- Stripe sends `invoice.payment_failed` webhook
- Verify subscription.status changes to "past_due"

**Test cancel (from app):**

1. Go to /app/settings/billing
2. Click "Cancel subscription"
3. Verify local DB status = "canceled"
4. Verify Stripe subscription also canceled (check Stripe dashboard)

**Test cancel (from Stripe):**

1. Cancel subscription in Stripe dashboard
2. Stripe sends `customer.subscription.deleted` webhook
3. Verify local status changes to "canceled"
4. Verify cancellation email templates fire

**Test plan change:**

```bash
curl -X POST http://localhost:5173/api/billing/change-plan \
  -H 'Content-Type: application/json' \
  -d '{"newPlanId":"<new-plan-id>"}'
# Verify prorationAmountInCents in response
# Verify Stripe subscription updated (check Stripe dashboard)
```

**Test refund:**

```bash
curl -X POST http://localhost:5173/api/admin/billing/refund \
  -H 'Content-Type: application/json' \
  -d '{"invoiceId":"<invoice-id>","reason":"requested_by_customer"}'
# Verify invoice.status -> "void"
# Verify Stripe charge.refunded webhook fires
```

**Test webhook idempotency:**

```bash
# Resend a previously processed event
stripe events resend evt_xxx
# Verify API returns { duplicate: true }
```

## Polar

**Credentials:**

1. Create account at https://polar.sh
2. Switch workspace to "Sandbox" from dropdown
3. Settings > Developers > API Keys > Create ("Server" type) -> copy `pol_sat_...`
4. Settings > Developers > Webhooks > Add endpoint:
   - URL: `https://your-tunnel.com/billing/webhooks/polar`
   - Events: checkout.updated, subscription.active, subscription.revoked, subscription.updated, order.created, order.paid, order.refunded
   - Copy webhook secret

**Setup product and price:**

```bash
POLAR_KEY="pol_sat_..."

# Create product
PRODUCT=$(curl -s -X POST https://api.polar.sh/v1/products \
  -H "Authorization: Bearer $POLAR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pro","description":"Pro plan"}')
PRODUCT_ID=$(echo $PRODUCT | jq -r '.id')

# Create price
PRICE=$(curl -s -X POST https://api.polar.sh/v1/prices \
  -H "Authorization: Bearer $POLAR_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"product_id\": \"$PRODUCT_ID\",
    \"amount_type\": \"fixed\",
    \"price_amount\": 1000,
    \"price_currency\": \"usd\",
    \"recurring_interval\": \"month\"
  }")
PRICE_ID=$(echo $PRICE | jq -r '.id')

# Register in app admin
curl -X POST http://localhost:5173/api/admin/billing/plans \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Pro\",\"slug\":\"pro\",\"priceInCents\":1000,\"interval\":\"month\",\"processor\":\"polar\",\"processorPriceId\":\"$PRICE_ID\"}"
```

**Webhook testing (local dev):**

- No CLI forwarder. Use `cloudflared tunnel` or `ngrok`
- Use dashboard "Send test event" button per webhook type
- Alternatively mock with `nock`/`msw` in unit tests

**Test checkout:**

1. Subscribe via billing settings -> redirects to Polar checkout
2. Use test card: `4242 4242 4242 4242`
3. Verify webhook: `checkout.updated` -> subscription created
4. Verify webhook: `subscription.active` -> status active
5. Cancel in Polar dashboard -> verify `subscription.revoked`

**Test plan change:**

```bash
curl -X POST https://api.polar.sh/v1/subscriptions/<sub_id> \
  -H "Authorization: Bearer $POLAR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"price_id":"<new_price_id>"}'
# Verify subscription.updated webhook fires
```

**Test cancel:**

```bash
curl -X POST https://api.polar.sh/v1/subscriptions/<sub_id>/cancel \
  -H "Authorization: Bearer $POLAR_KEY"
# Verify subscription.revoked webhook
```

## Lemon Squeezy

**Credentials:**

1. Create account at https://lemonsqueezy.com
2. Toggle "Test Mode" at top of dashboard
3. Settings > API > Generate (enable "Events" scope) -> copy key
4. Store > Products > New Product -> create product
5. Create a variant on the product (this is your "price ID"): copy the numeric variant ID
6. Settings > Webhooks > Add Endpoint:
   - URL: `https://your-tunnel.com/billing/webhooks/lemon-squeezy`
   - Events: order_created, order_refunded, subscription_created, subscription_updated, subscription_cancelled, subscription_expired, subscription_paused, subscription_unpaused
   - Copy the signing secret

**Variant creation:**

- No API for creating variants -- must be done in dashboard. Copying a variant ID from the dashboard is the "price ID" equivalent. Plan admin UI must have a text field for pasting these manually.

**Register plan:**

```bash
curl -X POST http://localhost:5173/api/admin/billing/plans \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pro","slug":"pro","priceInCents":1000,"interval":"month","processor":"lemon-squeezy","processorPriceId":"123456"}'
```

**Webhook testing (local dev):**

- No CLI. Use `cloudflared tunnel` or `ngrok`
- Dashboard has "Send Test" per event type
- Verify `X-Signature` HMAC-SHA256 header is validated

**Test checkout:**

1. Subscribe via billing settings -> redirects to Lemon Squeezy
2. Use test card: `4242 4242 4242 4242`
3. Verify webhooks: `order_created` -> `subscription_created`

**Test plan change (via API, no portal):**

```bash
curl -X PATCH https://api.lemonsqueezy.com/v1/subscriptions/<sub_id> \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"data":{"type":"subscriptions","id":"<sub_id>","attributes":{"variant_id":"<new_variant_id>"}}}'
# Verify subscription_updated webhook
```

**Test cancel (via API):**

```bash
curl -X POST https://api.lemonsqueezy.com/v1/subscriptions/<sub_id>/cancel \
  -H "Authorization: Bearer <api_key>"
# Verify subscription_cancelled webhook
```

**Test refund:**

```bash
curl -X POST https://api.lemonsqueezy.com/v1/refunds \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"data":{"type":"refunds","attributes":{"order_id":"<order_id>","reason":"requested_by_customer"}}}'
# Verify order_refunded webhook
```

## Paddle

**Credentials:**

1. Create account at https://paddle.com
2. Sidebar: Vendors > Sandbox (toggle)
3. Developer Tools > Authentication > Generate -> copy API key
4. Catalog > Products > New Product > Add Price -> copy price ID (`pri_...`)
5. Developer Tools > Notifications > New Destination:
   - URL: `https://your-tunnel.com/billing/webhooks/paddle`
   - Events: transaction.completed, transaction.paid, transaction.refunded, subscription.created, subscription.updated, subscription.canceled, subscription.activated
   - Copy the notification secret

**Register plan:**

```bash
curl -X POST http://localhost:5173/api/admin/billing/plans \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pro","slug":"pro","priceInCents":1000,"interval":"month","processor":"paddle","processorPriceId":"pri_xxx"}'
```

**Webhook testing (local dev):**

- Use `cloudflared tunnel` or `ngrok`
- Dashboard "Send test notification" button
- JWK verification: must fetch `https://api.paddle.com/.well-known/jwks` at verification time

**Test checkout:**

1. Subscribe via billing settings -> redirects to Paddle checkout
2. Use test card: `4242 4242 4242 4242`
3. Verify: `transaction.completed` -> `transaction.paid` -> `subscription.created`

**Test plan change:**

```bash
curl -X PATCH https://api.paddle.com/subscriptions/<sub_id> \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"price_id":"<new_price_id>","quantity":1}],"proration_billing_mode":"prorated_immediately"}'
# Verify subscription.updated webhook
```

**Test cancel:**

```bash
curl -X POST https://api.paddle.com/subscriptions/<sub_id>/cancel \
  -H "Authorization: Bearer <api_key>" \
  -d '{"effective_from":"next_billing_period"}'
# Verify subscription.canceled webhook
```

**Test refund:**

```bash
curl -X POST https://api.paddle.com/transactions/<txn_id>/refund \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"amount":"1000","currency_code":"USD"}'
# Verify transaction.refunded webhook
```

## PayPal

**Credentials:**

1. Go to https://developer.paypal.com
2. Dashboard > Sandbox > Accounts:
   - Create a Business account (for receiving) -> copy email
   - Create a Personal account (for making payments) -> copy email
3. My Apps & Credentials > Create App (Sandbox) -> copy Client ID and Secret
4. My Apps & Credentials > Select App > Webhooks > Add Webhook:
   - URL: `https://your-tunnel.com/billing/webhooks/paypal`
   - Events: BILLING.SUBSCRIPTION.CREATED, BILLING.SUBSCRIPTION.ACTIVATED, BILLING.SUBSCRIPTION.UPDATED, BILLING.SUBSCRIPTION.CANCELLED, BILLING.SUBSCRIPTION.SUSPENDED, BILLING.SUBSCRIPTION.EXPIRED, BILLING.SUBSCRIPTION.PAYMENT.FAILED, PAYMENT.SALE.COMPLETED, PAYMENT.CAPTURE.REFUNDED
   - Copy Webhook ID

**Setup product and plan (must be created via PayPal API first):**

```bash
# Get OAuth token
TOKEN=$(curl -s -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -u "CLIENT_ID:SECRET" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

# Create product
PRODUCT=$(curl -s -X POST https://api-m.sandbox.paypal.com/v1/catalog/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pro Plan","type":"SERVICE","category":"SOFTWARE"}')
PRODUCT_ID=$(echo $PRODUCT | jq -r '.id')

# Create billing plan
PLAN=$(curl -s -X POST https://api-m.sandbox.paypal.com/v1/billing/plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"product_id\": \"$PRODUCT_ID\",
    \"name\": \"Pro Monthly\",
    \"billing_cycles\": [{
      \"frequency\": {\"interval_unit\": \"MONTH\", \"interval_count\": 1},
      \"tenure_type\": \"REGULAR\",
      \"sequence\": 1,
      \"total_cycles\": 0,
      \"pricing_scheme\": {\"fixed_price\": {\"value\": \"10.00\", \"currency_code\": \"USD\"}}
    }],
    \"payment_preferences\": {
      \"auto_bill_outstanding\": true,
      \"setup_fee_failure_action\": \"CANCEL\",
      \"payment_failure_threshold\": 3
    }
  }")
PLAN_ID=$(echo $PLAN | jq -r '.id')

# Register in app admin
curl -X POST http://localhost:5173/api/admin/billing/plans \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Pro\",\"slug\":\"pro\",\"priceInCents\":1000,\"interval\":\"month\",\"processor\":\"paypal\",\"processorPriceId\":\"$PLAN_ID\"}"
```

**Webhook testing (local dev):**

- Use `cloudflared tunnel` or `ngrok`
- Developer Dashboard > Webhooks Simulator > select event type, send test
- Verification requires post body cert chain verification against PayPal's public cert URL

**Test checkout (two-phase PayPal flow):**

Phase 1 - create subscription (backend):

```bash
SUB=$(curl -s -X POST https://api-m.sandbox.paypal.com/v1/billing/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"plan_id\": \"$PLAN_ID\",
    \"subscriber\": {\"name\": {\"given_name\": \"Test\", \"surname\": \"User\"}},
    \"application_context\": {
      \"return_url\": \"https://your-tunnel.com/billing/callback/paypal\",
      \"cancel_url\": \"https://your-tunnel.com/app/settings/billing?canceled=true\"
    }
  }")
SUB_ID=$(echo $SUB | jq -r '.id')
APPROVAL_URL=$(echo $SUB | jq -r '.links[] | select(.rel=="approve") | .href')
echo "Approval URL: $APPROVAL_URL"
```

Phase 2 - user approves then callback fires:

1. Redirect user to `$APPROVAL_URL`
2. User logs in with Personal sandbox account (the one from Sandbox > Accounts)
3. User approves subscription
4. PayPal redirects to `return_url?subscription_id=$SUB_ID&ba_token=BA-xxx`
5. Your callback route `GET /billing/callback/paypal` must:
   - Call `POST /v1/billing/subscriptions/$SUB_ID/activate`
   - Store subscription in local DB
   - Redirect user to billing settings page

**Test plan change:**

```bash
curl -X POST https://api-m.sandbox.paypal.com/v1/billing/subscriptions/$SUB_ID/revise \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"P-NEW","effective_time":"now"}'
# Verify BILLING.SUBSCRIPTION.UPDATED webhook
```

**Test cancel:**

```bash
curl -X POST https://api-m.sandbox.paypal.com/v1/billing/subscriptions/$SUB_ID/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Customer requested"}'
# Verify BILLING.SUBSCRIPTION.CANCELLED webhook
```

**Test payment failure:**

- Use the "negative test" email for the sandbox Personal account (enable in Sandbox > Accounts > settings)
- Trigger BILLING.SUBSCRIPTION.PAYMENT.FAILED webhook
- Verify subscription marked `past_due`

**Test refund (requires a completed SALE transaction):**

```bash
# Get sale ID from PAYMENT.SALE.COMPLETED webhook payload
curl -X POST https://api-m.sandbox.paypal.com/v1/payments/sale/<sale_id>/refund \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Verify PAYMENT.CAPTURE.REFUNDED webhook
```

## Crypto (Coinbase Commerce)

**Credentials:**

1. Create account at https://commerce.coinbase.com
2. Settings > API Keys > Create API Key -> copy key
3. Settings > Webhook subscriptions > Add endpoint:
   - URL: `https://your-tunnel.com/billing/webhooks/crypto`
   - Events: charge:confirmed, charge:failed, charge:delayed, charge:pending
   - Copy webhook shared secret

**No sandbox mode:** Coinbase Commerce does not have a test/sandbox mode. All charges are live (mainnet). To test without real funds:

- Use a testnet wallet (ETH Sepolia/Goerli with test ETH from a faucet)
- Or mock the API with `nock`/`msw` in all tests and use production only for staging/prod

**Test charge creation:**

```bash
curl -X POST https://api.commerce.coinbase.com/charges \
  -H "X-CC-Api-Key: <api_key>" \
  -H "X-CC-Version: 2018-03-22" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Plan - Monthly",
    "description": "Pro subscription monthly charge",
    "pricing_type": "fixed_price",
    "local_price": {"amount": "10.00", "currency": "USD"},
    "redirect_url": "https://your-tunnel.com/app/settings/billing",
    "cancel_url": "https://your-tunnel.com/app/settings/billing"
  }'
# Response includes "hosted_url" -> redirect user to this
# Response includes "id" -> this is the charge ID, use as processorSubscriptionId
```

**Subscriptions simulation flow:**

1. Create charge via API -> redirect user to `hosted_url`
2. User pays with crypto in Coinbase hosted UI
3. `charge:confirmed` webhook fires -> service layer:
   - Creates subscription record with status "active"
   - Stores tx hash in invoice metadata
   - Sets `currentPeriodEnd` = now + billing interval
   - Cron trigger picks up expired `currentPeriodEnd` and creates new charge

**Webhook testing (local dev):**

- Use `cloudflared tunnel` or `ngrok`
- Dashboard has "Send test notification" button

**Test charge failure:**

- Webhook `charge:failed` -> mark subscription as `past_due`
- Verify failure email fires

**Test charge expiry:**

- Create a charge, do not pay it
- After ~1 hour (default), `charge:expired` fires
- Verify subscription creation is aborted

**Idempotency:**

- Resend the same `charge:confirmed` event
- Verify duplicate is detected in `webhook_event` table (same event ID + processor = "crypto")

## Dodo Payments

**Credentials:**

1. Create account at https://dodopayments.com
2. Dashboard > Developers > API Keys > Create ("read-write" type) -> copy key
3. Dashboard > Developers > Webhooks > Add endpoint:
   - URL: `https://your-tunnel.com/billing/webhooks/dodo`
   - Events: subscription.active, subscription.updated, subscription.cancelled, subscription.renewed, subscription.plan_changed, subscription.on_hold, subscription.expired, payment.succeeded, payment.failed, refund.succeeded
   - Copy webhook secret
4. Environment: use `test_mode` for sandbox, `live_mode` for production

**API Base URLs:**

- Test: `https://test.dodopayments.com/`
- Live: `https://live.dodopayments.com/`

**Webhook forwarding (local dev):**

```bash
# Dodo has a native CLI for forwarding test webhooks
npx dodo wh listen --forward-to localhost:5173/billing/webhooks/dodo
# Or trigger individual mock events:
npx dodo wh trigger subscription.active
```

**Test cards:**

| Card                  | Behavior                    |
| --------------------- | --------------------------- |
| `4242 4242 4242 4242` | Visa success                |
| `5555 5555 5555 4444` | Mastercard success          |
| `4000 0000 0000 0002` | Generic decline             |
| `4000 0000 0000 9995` | Insufficient funds          |
| `4000 0000 0000 0341` | Renewal failure (exp 12/34) |

**Setup product:**

```bash
DODO_KEY="your-test-api-key"

# Create product
curl -s -X POST https://test.dodopayments.com/products \
  -H "Authorization: Bearer $DODO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pro","description":"Pro plan","price":1000,"is_recurring":true,"tax_inclusive":false}'
# Copy product_id from response

# Register in app admin
curl -X POST http://localhost:5173/api/admin/billing/plans \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pro","slug":"pro","priceInCents":1000,"interval":"month","processor":"dodo","processorPriceId":"<product_id>"}'
```

**Test checkout:**

1. Subscribe via billing settings -> redirects to Dodo hosted checkout (`https://checkout.dodopayments.com/...`)
2. Use test card: `4242 4242 4242 4242`
3. Verify webhook: `subscription.active` -> status active
4. Cancel in Dodo dashboard -> verify `subscription.cancelled`

**Test plan change:**

```bash
curl -X POST https://test.dodopayments.com/subscriptions/<sub_id>/change-plan \
  -H "Authorization: Bearer $DODO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"<new_product_id>","proration_billing_mode":"prorated_immediately"}'
# Verify subscription.plan_changed webhook fires
```

**Test cancel:**

```bash
# Via API or customer portal
curl -X PATCH https://test.dodopayments.com/subscriptions/<sub_id> \
  -H "Authorization: Bearer $DODO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}'
# Verify subscription.cancelled webhook
```

**Test refund:**

```bash
curl -X POST https://test.dodopayments.com/refunds \
  -H "Authorization: Bearer $DODO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"payment_id":"<payment_id>","reason":"Customer request"}'
# Verify refund.succeeded webhook
```

**Webhook verification:**

- Standard Webhooks spec: headers `webhook-id`, `webhook-signature`, `webhook-timestamp`
- HMAC-SHA256 of `webhook-id.timestamp.raw_body` with webhook secret
- SDK: `client.webhooks.unwrap(body, { headers })` handles verification automatically
- Secret rotation: 24-hour grace period for old secret

**Idempotency:**

- Each webhook carries unique `webhook-id` header
- Store processed `webhook-id` values, skip duplicates
- 8 retries with exponential backoff (5s, 5min, 30min, 2h, 5h, 10h, 10h)

**SvelteKit adapter:** `@dodopayments/sveltekit` provides ready-made Checkout, CustomerPortal, and Webhooks route handlers.

## Chargebee

**Credentials:**

1. Create account at https://chargebee.com
2. Select "Test" site (created automatically with account)
3. Settings > API Keys > Generate API Key -> copy key (used as username, password is empty)
4. Settings > Webhooks > Add Webhook:
   - URL: `https://your-tunnel.com/billing/webhooks/chargebee`
   - Events: subscription_created, subscription_started, subscription_changed, subscription_cancelled, subscription_reactivated, subscription_renewed, invoice_created, invoice_paid, payment_succeeded, payment_failed, payment_refunded
   - Webhooks use Basic Auth: set a username/password that your endpoint validates

**API Base URL:**

```
https://{your-site}.chargebee.com/api/v2/
# Test site: https://{your-site}-test.chargebee.com/api/v2/
```

**Auth:** HTTP Basic Auth — API key as username, empty password.

**Setup product and plan:**

```bash
CB_KEY="your-api-key"
CB_SITE="your-site-test"

# Create item (product)
curl -s -X POST "https://${CB_SITE}.chargebee.com/api/v2/items" \
  -u "$CB_KEY:" \
  -d 'id=pro-plan' \
  -d 'name=Pro' \
  -d 'type=plan' \
  -d 'item_family_id[0]=default'

# Create item price
curl -s -X POST "https://${CB_SITE}.chargebee.com/api/v2/item_prices" \
  -u "$CB_KEY:" \
  -d 'item_id=pro-plan' \
  -d 'id=pro-monthly-usd' \
  -d 'name=Pro Monthly' \
  -d 'pricing_model=flat_fee' \
  -d 'price=1000' \
  -d 'currency_code=USD' \
  -d 'period=1' \
  -d 'period_unit=month'

# Register in app admin
curl -X POST http://localhost:5173/api/admin/billing/plans \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pro","slug":"pro","priceInCents":1000,"interval":"month","processor":"chargebee","processorPriceId":"pro-monthly-usd"}'
```

**Webhook testing (local dev):**

- No CLI forwarder. Use `cloudflared tunnel` or `ngrok`
- Dashboard "Send test webhook" per event type
- Verification: Basic Auth credentials on webhook endpoint + IP allowlisting
- For extra safety, re-fetch the event from Chargebee API to confirm authenticity

**Test checkout (hosted page):**

```bash
curl -s -X POST "https://${CB_SITE}.chargebee.com/api/v2/hosted_pages/checkout_one_time" \
  -u "$CB_KEY:" \
  -d 'subscription[item_price_id][0]=pro-monthly-usd' \
  -d 'customer[email]=test@example.com'
# Response includes hosted_page.url -> redirect user there
```

1. Redirect user to the hosted page URL
2. User completes payment
3. Verify webhooks: `subscription_created` -> `payment_succeeded` -> `invoice_paid`

**Test plan change:**

```bash
curl -s -X POST "https://${CB_SITE}.chargebee.com/api/v2/subscriptions/<sub_id>/change_term_end" \
  -u "$CB_KEY:"
# Or update subscription items for plan change:
curl -s -X POST "https://${CB_SITE}.chargebee.com/api/v2/subscriptions/<sub_id>" \
  -u "$CB_KEY:" \
  -d 'subscription[item_price_id][0]=new-plan-price-id'
# Verify subscription_changed webhook
```

**Test cancel:**

```bash
curl -s -X POST "https://${CB_SITE}.chargebee.com/api/v2/subscriptions/<sub_id>/cancel" \
  -u "$CB_KEY:"
# Verify subscription_cancelled webhook
```

**Test refund:**

```bash
curl -s -X POST "https://${CB_SITE}.chargebee.com/api/v2/invoices/<invoice_id>/refund" \
  -u "$CB_KEY:" \
  -d 'refund_amount=1000' \
  -d 'comment=Customer request'
# Verify payment_refunded webhook
```

**Idempotency:**

- API supports `idempotency_key` parameter on POST endpoints
- Webhook deduplication: event `id` uniqueness

**Note:** Chargebee is a billing platform, not a payment gateway. It routes payments through configured gateways (Stripe, PayPal, Braintree, etc.). Tax handling is via Avalara or TaxJar integration — Chargebee does not handle tax as MoR.

## FastSpring

**Credentials:**

1. Create account at https://fastspring.com
2. Dashboard > Developer Tools > APIs > API Credentials > Create -> copy username + password
3. Dashboard > Developer Tools > Webhooks > Configuration:
   - URL: `https://your-tunnel.com/billing/webhooks/fastspring`
   - Events: subscription.activated, subscription.canceled, subscription.deactivated, subscription.updated, subscription.charge.completed, subscription.charge.failed, subscription.payment.overdue
   - Copy webhook secret
4. Create products in Dashboard > Products or via API

**API Base URL:** `https://api.fastspring.com` (same for test and live)

**Auth:** HTTP Basic Auth — API credential username + password.

**Test vs Live storefronts:**

- Test: `https://yourstore.test.onfastspring.com/p/{product-path}`
- Live: `https://yourstore.onfastspring.com/p/{product-path}`
- Test orders include `"live": false` in webhook payloads

**Test cards:**

| Card                  | Behavior        |
| --------------------- | --------------- |
| `4242 4242 4242 4242` | Success         |
| `4012 8888 8888 1881` | Success         |
| `4000 0000 0000 0127` | Invalid CVV     |
| `4100 0000 0000 0019` | Risk (flagged)  |
| `4000 0000 0000 0002` | Generic decline |

**Setup product:**

```bash
FS_USER="your-api-username"
FS_PASS="your-api-password"

curl -s -X POST https://api.fastspring.com/products \
  -u "$FS_USER:$FS_PASS" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [{
      "product": "pro-plan",
      "display": { "en": "Pro Plan" },
      "pricing": { "USD": 10.00 },
      "interval": "MONTH",
      "intervalLength": 1,
      "trial": { "interval": "WEEK", "length": 2 }
    }]
  }'

# Register in app admin
curl -X POST http://localhost:5173/api/admin/billing/plans \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pro","slug":"pro","priceInCents":1000,"interval":"month","processor":"fastspring","processorPriceId":"pro-plan"}'
```

**Webhook testing (local dev):**

- No CLI forwarder. Use `cloudflared tunnel` or `ngrok`
- Dashboard has test event sending
- Verification: `X-FS-Signature` header (base64-encoded HMAC-SHA256 of raw body with webhook secret)

**Test checkout (hosted storefront):**

1. Redirect user to `https://yourstore.test.onfastspring.com/p/pro-plan`
2. User completes payment on FastSpring hosted page
3. Verify webhooks: `subscription.activated` -> `subscription.charge.completed`
4. Cancel in FastSpring dashboard -> verify `subscription.canceled` then `subscription.deactivated`

**Test plan change:**

```bash
curl -s -X POST https://api.fastspring.com/subscriptions \
  -u "$FS_USER:$FS_PASS" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptions": [{
      "subscription": "<sub_id>",
      "product": "new-plan-product-path",
      "quantity": 1
    }]
  }'
# Verify subscription.updated webhook
```

**Test cancel:**

```bash
# Cancel at end of billing period
curl -s -X DELETE "https://api.fastspring.com/subscriptions/<sub_id>?billingPeriod=1" \
  -u "$FS_USER:$FS_PASS"
# Cancel immediately
curl -s -X DELETE "https://api.fastspring.com/subscriptions/<sub_id>?billingPeriod=0" \
  -u "$FS_USER:$FS_PASS"
# Verify subscription.canceled webhook, then subscription.deactivated at period end
```

**Test refund:**

```bash
curl -s -X POST https://api.fastspring.com/returns \
  -u "$FS_USER:$FS_PASS" \
  -H "Content-Type: application/json" \
  -d '{
    "returns": [{
      "order": "<order_id>",
      "type": "FULL",
      "reason": "OTHER",
      "note": "Customer request"
    }]
  }'
# Verify order refund processed
```

**Webhook verification:**

```javascript
const crypto = require('crypto')
const isValid = (body, signature, secret) => {
  const computed = crypto.createHmac('sha256', secret).update(body).digest().toString('base64')
  return computed === signature
}
// Validate X-FS-Signature header against computed HMAC
```

**Idempotency:**

- No API-level idempotency key support
- Webhook deduplication: event `id` uniqueness
- Recommend tracking processed event IDs in `webhook_event` table

**Note:** FastSpring is a Merchant of Record — handles tax calculation, collection, and remittance across 60+ jurisdictions globally. Do not apply local tax logic for FastSpring subscriptions.
