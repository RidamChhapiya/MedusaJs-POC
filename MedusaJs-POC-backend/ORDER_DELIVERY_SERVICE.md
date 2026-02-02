# Order Delivery Service

Simple admin endpoints to run common post-order actions in one place: **capture payment** (if not already done), **create fulfillment** (mark as shipped), and **mark as delivered**.

## Endpoints

### Run delivery actions

**`POST /admin/orders/:id/delivery-actions`**

Runs one or more actions in sequence. By default all three run; you can turn any off via the body.

**Body (optional):**
```json
{
  "capture": true,
  "ship": true,
  "deliver": true
}
```
- `capture`: Capture payment if the order has a payment collection and any payment is not yet captured. If there is no payment, use **`POST /admin/orders/:id/mark-paid`** first.
- `ship`: Create a fulfillment for all order line items (marks as shipped). Uses the order’s first shipping method. Idempotent if items are already fulfilled.
- `deliver`: Mark each fulfillment that is shipped but not delivered as delivered.

**Example – run everything:**
```bash
curl -X POST "http://localhost:9000/admin/orders/order_01ABC123/delivery-actions" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Example – only capture and ship:**
```bash
curl -X POST "http://localhost:9000/admin/orders/order_01ABC123/delivery-actions" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"deliver": false}'
```

**Response:**
```json
{
  "success": true,
  "order_id": "order_01ABC123",
  "capture": "Captured payment pay_xxx",
  "ship": "Fulfillment created (marked as shipped)",
  "deliver": "Marked fulfillment ful_xxx as delivered"
}
```
If any step fails, `errors` is included and `success` is `false`.

---

### Get delivery status

**`GET /admin/orders/:id/delivery-status`**

Returns what can still be done for the order (capture, ship, deliver).

**Response:**
```json
{
  "order_id": "order_01ABC123",
  "payment": {
    "has_collection": true,
    "captured": false,
    "can_capture": true
  },
  "fulfillment": {
    "has_items": true,
    "fulfillments_count": 0,
    "all_shipped": false,
    "all_delivered": false,
    "can_ship": true,
    "can_deliver": false
  }
}
```

Use this to show buttons like “Capture payment”, “Mark as shipped”, “Mark as delivered” in your admin or tooling.

## Existing admin APIs

You can also use Medusa’s built-in admin routes for single actions:

- **Capture payment:** `POST /admin/payments/:payment_id/capture`
- **Create fulfillment (ship):** `POST /admin/orders/:id/fulfillments` (body: `items`, optional `location_id`, `shipping_option_id`, etc.)
- **Mark as delivered:** `POST /admin/orders/:id/fulfillments/:fulfillment_id/mark-as-delivered`
- **Mark as paid (manual):** `POST /admin/orders/:id/mark-paid` (this project’s custom route when there is no payment collection)

The delivery service above is a convenience wrapper that runs capture → ship → deliver in one call and reports what was done.
