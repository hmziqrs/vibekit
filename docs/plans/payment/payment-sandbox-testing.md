---
name: Sandbox Testing Guide for Payment Processors
description: Step-by-step sandbox setup and testing procedures for Stripe, Polar, Lemon Squeezy, Paddle, PayPal, and Coinbase Commerce
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
