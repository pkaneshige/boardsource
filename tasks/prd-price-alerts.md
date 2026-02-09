# PRD: Price Alerts

## Introduction

Allow users to set price alerts on surfboards so they're notified in-app when a board drops below their target price or comes back in stock. Users set alerts via a simple form on the product detail page and view triggered notifications from a bell icon in the site header.

This builds on the existing price history infrastructure — when a sync detects a price change or stock status change, the system checks all active alerts for that surfboard and triggers any that match.

## Goals

- Let users create price drop alerts with a target price on any surfboard
- Let users create back-in-stock alerts for out-of-stock surfboards
- Automatically check alerts during sync when prices or stock status change
- Show triggered alerts via an in-app notification bell in the header
- Allow users to dismiss/clear notifications

## User Stories

### US-001: Create priceAlert and notification Sanity schemas
**Description:** As a developer, I need document types to store alert subscriptions and triggered notifications.

**Acceptance Criteria:**
- [ ] Create `priceAlert` document type: `email` (string, required), `surfboard` (reference, required), `alertType` ('price_drop' | 'back_in_stock'), `targetPrice` (number, optional — required for price_drop), `active` (boolean, default true), `createdAt` (datetime)
- [ ] Create `notification` document type: `email` (string, required), `surfboard` (reference, required), `alertType` (string), `message` (string), `previousPrice` (number, optional), `newPrice` (number, optional), `read` (boolean, default false), `createdAt` (datetime)
- [ ] Add both schemas to `lib/cms/schemas/index.ts`
- [ ] Typecheck passes

### US-002: Create alert management API routes
**Description:** As a developer, I need API endpoints to create and manage price alerts.

**Acceptance Criteria:**
- [ ] POST `/api/alerts` — creates a new priceAlert document. Body: `{ email, surfboardId, alertType, targetPrice? }`. Returns the created alert ID
- [ ] GET `/api/alerts?email=...` — returns all active alerts for an email address
- [ ] DELETE `/api/alerts/[id]` — deactivates an alert (sets active to false)
- [ ] All endpoints validate required fields and return appropriate error responses
- [ ] Typecheck passes

### US-003: Check alerts during sync
**Description:** As a developer, I want the sync process to automatically check and trigger alerts when prices drop or boards come back in stock.

**Acceptance Criteria:**
- [ ] Create `lib/cms/alerts.ts` with `checkAlerts(surfboardId, newPrice, newStockStatus, oldPrice?, oldStockStatus?)` function
- [ ] For `price_drop` alerts: trigger if `newPrice <= targetPrice` and alert is active
- [ ] For `back_in_stock` alerts: trigger if `oldStockStatus === 'out_of_stock'` and `newStockStatus === 'in_stock'` and alert is active
- [ ] When triggered, create a `notification` document and set the alert to `active: false` (one-shot)
- [ ] Integrate into `upsertSurfboard` — pass old and new price/stock status to `checkAlerts`
- [ ] Function is resilient (try/catch, logs errors, doesn't break sync)
- [ ] Typecheck passes

### US-004: Add "Set Price Alert" form on detail page
**Description:** As a user, I want to set a price alert on a surfboard from its detail page.

**Acceptance Criteria:**
- [ ] Create `app/surfboards/[slug]/price-alert-form.tsx` as a `"use client"` component
- [ ] Shows a "Set Price Alert" button that expands into a form
- [ ] Form fields: email (required), alert type radio (Price Drop / Back in Stock), target price input (shown only for Price Drop, pre-filled with current price minus 10%)
- [ ] Submits to POST `/api/alerts`, shows success/error state
- [ ] Back in Stock option only appears when board is out of stock
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Add notification bell to site header
**Description:** As a user, I want to see my triggered alerts via a notification bell so I know when prices have dropped.

**Acceptance Criteria:**
- [ ] GET `/api/notifications?email=...` — returns unread notifications for an email
- [ ] PATCH `/api/notifications/[id]` — marks a notification as read
- [ ] Create `components/notification-bell.tsx` as a `"use client"` component
- [ ] Shows bell icon in the header with unread count badge
- [ ] Clicking opens a dropdown listing notifications with board name, alert type, price info
- [ ] Each notification links to the surfboard detail page
- [ ] "Mark all read" button clears the unread count
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Integrate alert form and notification bell into pages
**Description:** As a user, I want the alert form on detail pages and the notification bell in the header.

**Acceptance Criteria:**
- [ ] Add PriceAlertForm to `app/surfboards/[slug]/page.tsx` below the buy button
- [ ] Pass surfboard ID, current price, and stock status as props
- [ ] Add NotificationBell to the site layout/header
- [ ] NotificationBell prompts for email on first use (stores in localStorage)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: `priceAlert` document stores email, surfboard reference, alert type, optional target price, active boolean, and creation timestamp
- FR-2: `notification` document stores email, surfboard reference, alert type, message text, optional old/new prices, read boolean, and creation timestamp
- FR-3: POST `/api/alerts` creates a priceAlert, validates required fields, prevents duplicate active alerts for same email+surfboard+type
- FR-4: During sync, `checkAlerts` queries active alerts for the surfboard, evaluates trigger conditions, creates notifications, and deactivates triggered alerts
- FR-5: GET `/api/notifications?email=...` returns notifications sorted by createdAt desc
- FR-6: The notification bell shows unread count and dropdown with notification details
- FR-7: Alert form validates email format and target price (must be > 0 for price_drop)

## Non-Goals

- No email delivery — in-app notifications only
- No user accounts or authentication — alerts are tied to email addresses stored in localStorage
- No alert editing — users delete and recreate if they want to change target price
- No bulk alert management page
- No push notifications or webhooks

## Technical Considerations

- Alerts are checked inside `upsertSurfboard` alongside `recordPriceSnapshot` — both are resilient and non-blocking
- Need to fetch the existing surfboard's price/stockStatus before the upsert to have "old" values for comparison
- Email stored in localStorage for the notification bell — no server-side session needed
- Notification bell polls or fetches on page load (no WebSocket needed for MVP)
- Use the same `sanityWriteClient` from `lib/cms/sanity-write-client.ts` to avoid circular imports

## Success Metrics

- Users can set price alerts in under 30 seconds
- Alerts trigger correctly when sync detects matching price/stock changes
- Notification bell shows accurate unread count
- No regression in sync performance (alert checking adds minimal overhead)
