# Stripe test-payment API for Stuudio Aeg

This folder contains the payment server for **Stuudio Aeg**, a hair salon booking application developed as a coursework project.

The server connects the frontend, PocketBase and Stripe Checkout. Payments are processed in **Stripe Sandbox only**. No real money is charged.

## 1. How it works

1. A user signs in to Stuudio Aeg and creates a booking.
2. The user clicks **“Maksa 25 € (test)”** next to an unpaid booking.
3. The frontend calls the payment server at `POST /api/checkout`.
4. The server verifies the user's identity and booking ownership, then creates a Stripe Checkout session.
5. The user completes a €25 test payment in Stripe Checkout.
6. Stripe sends a signed payment confirmation to `POST /stripe/webhook`.
7. The server updates the booking in PocketBase: `paid = true` and `stripe_session_id` is saved.
8. The frontend displays **“Makstud (test)”** for the paid booking.

The payment status is updated by the server after Stripe confirms the payment, not by the browser redirect alone.

## 2. Technologies

* Node.js and Express — payment API
* Stripe Checkout — test payments
* Stripe webhook — payment confirmation
* PocketBase — user authentication and booking data
* Coolify and Docker — deployment

## 3. API endpoints

| Endpoint               | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `GET /health`          | Checks whether the payment server is running    |
| `POST /api/checkout`   | Creates a Stripe Checkout session for a booking |
| `POST /stripe/webhook` | Receives and verifies Stripe payment events     |

The health endpoint returns:

`{"ok":true}`

## 4. PocketBase setup

The `bookings` collection contains the following payment fields:

| Field               | Type    | Purpose                                     |
| ------------------- | ------- | ------------------------------------------- |
| `paid`              | Boolean | Indicates whether the booking has been paid |
| `stripe_session_id` | Text    | Stores the Stripe Checkout session ID       |

The `slot` field has a unique index to prevent two bookings from using the same time slot. Customers cannot directly update payment fields through the public API.

## 5. Environment variables

Configure these variables **on the payment server**, not in the frontend:

| Variable                | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `PORT`                  | Server port, set to `3000` in Coolify    |
| `STRIPE_SECRET_KEY`     | Stripe Sandbox secret API key            |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret            |
| `STRIPE_PRICE_ID`       | Stripe price ID for the €25 test service |
| `PB_URL`                | PocketBase URL                           |
| `PB_ADMIN_EMAIL`        | PocketBase administrator email           |
| `PB_ADMIN_PASSWORD`     | PocketBase administrator password        |
| `FRONTEND_ORIGIN`       | Allowed frontend origin                  |

**Never commit API secret keys, administrator passwords or authentication tokens to GitHub.** The frontend must not contain these credentials.

## 6. Deployment in Coolify

Deploy the payment server as a separate application in the same Coolify project as the frontend and PocketBase.

* **Repository:** `vTyzee/emil-booking-saas`
* **Branch:** `main`
* **Base directory:** `/stripe-server`
* **Build strategy:** Railpack
* **Application type:** Dynamic
* **Port:** `3000`
* **Start command:** `npm start`

After configuring the environment variables, deploy the application and open `/health` to check that it responds.

In Stripe Sandbox, configure a webhook destination pointing to the payment server's `/stripe/webhook` endpoint. Subscribe to these events:

* `checkout.session.completed`
* `checkout.session.async_payment_succeeded`

Copy the destination's signing secret into the server environment variable `STRIPE_WEBHOOK_SECRET`.

## 7. Frontend integration

The frontend is already connected to this payment server. It uses the build-time environment variable `VITE_STRIPE_SERVER_URL` to locate the API.

The payment button opens Stripe Checkout for the selected booking. After a successful test payment, the frontend displays **“Makstud (test)”** once PocketBase contains the confirmed payment status.

## 8. Testing

The following checks were completed in the deployed coursework application:

* The payment server responded successfully at `/health`.
* The payment button opened Stripe Checkout for **“Meeste juukselõikus” (€25)**.
* A test payment was completed in Stripe Sandbox.
* The user returned to the booking application.
* The booking displayed **“Makstud (test)”**.
* PocketBase showed `paid = true` and a saved `stripe_session_id` for the paid booking.

These checks confirm the test-payment flow for the tested booking.

## 9. Limitations

This is a **coursework prototype**, not a production payment system.

* Only Stripe test payments are enabled.
* The payment flow is configured for the €25 haircut service.
* Unpaid bookings still occupy their selected time slots; automatic expiry and cancellation are not implemented.
* Refunds and customer-initiated booking cancellation are not implemented.
* The coursework server displayed a TLS certificate warning during testing. A valid HTTPS certificate and additional security checks are required before processing real customer data or payments.

The main project README contains the complete application description, user guide, architecture and deployment instructions.

**Main README:** https://github.com/vTyzee/emil-booking-saas
