# Stripe test-payment API for Stuudio Aeg

Deploy this folder as its own **web application** in Coolify. Build: Node.js/Railpack. Base directory: `/stripe-server`; start: `npm start`; port: `3000`. Define the environment variables described by `.env.example` **only in the server**. Do not commit actual credentials. Configure a Stripe *sandbox* webhook endpoint at `https://YOUR-PAYMENT-API-DOMAIN/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and put its sandbox `whsec_` in `STRIPE_WEBHOOK_SECRET`. Only use HTTPS with trusted certificates when entering credentials and connecting services.

Before enabling payment in the frontend, add two fields to the **bookings** collection in PocketBase: `paid` (bool, default false) and `stripe_session_id` (text, optional); keep update/delete API rules locked. Keep the existing unique index on `bookings.slot`.

The server uses a Stripe sandbox `price_` for the **25 EUR** haircut only, verifies PocketBase authentication and booking ownership, and marks the booking paid only after a signed Stripe webhook. The current frontend has **not yet been modified** to call `/api/checkout` or display payment status. A pending unpaid booking currently still occupies the slot; implement expiry/cancellation before any production use. This is a course demo only.
