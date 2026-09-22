import express from 'express';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';

const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID', 'PB_URL', 'PB_ADMIN_EMAIL', 'PB_ADMIN_PASSWORD', 'FRONTEND_ORIGIN'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing server environment variable: ${name}`);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const frontend = process.env.FRONTEND_ORIGIN.replace(/\/$/, '');
const pbUrl = process.env.PB_URL.replace(/\/$/, '');
const app = express();
app.disable('x-powered-by');

function pbClient() { const pb = new PocketBase(pbUrl); pb.autoCancellation(false); return pb; }
async function adminClient() {
  const pb = pbClient();
  await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD);
  return pb;
}
async function getBookingWithService(pb, id) {
  const booking = await pb.collection('bookings').getOne(id, { expand: 'slot,slot.service' });
  const slot = booking.expand?.slot;
  const service = slot?.expand?.service;
  if (!slot || !service) throw new Error('Booking has no valid service or slot');
  return { booking, slot, service };
}

app.post('/stripe/webhook', express.raw({type:'application/json'}), async (req, res) => {
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return res.status(400).send('Invalid webhook signature'); }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return res.sendStatus(200);
  const session = event.data.object;
  try {
    if (session.payment_status !== 'paid' || session.mode !== 'payment') return res.sendStatus(200);
    const bookingId = session.metadata?.bookingId;
    if (!bookingId || session.client_reference_id !== bookingId || session.currency !== 'eur' || session.amount_total !== 2500) return res.status(400).send('Invalid payment details');
    const pb = await adminClient();
    const { booking, service } = await getBookingWithService(pb, bookingId);
    if (Number(service.price_eur) !== 25 || booking.user !== session.metadata?.userId) return res.status(400).send('Booking mismatch');
    if (booking.paid) return res.sendStatus(200);
    await pb.collection('bookings').update(bookingId, {paid: true, stripe_session_id: session.id});
    res.sendStatus(200);
  } catch (error) { console.error('Webhook processing failed:', error?.message); res.sendStatus(500); }
});

app.use(express.json({limit:'8kb'}));
app.get('/health', (_req, res) => res.json({ok:true}));
app.post('/api/checkout', async (req, res) => {
  if (req.get('Origin') !== frontend) return res.status(403).json({error:'Origin is not allowed'});
  res.set('Access-Control-Allow-Origin', frontend);
  res.set('Vary','Origin');
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') || '');
  const id = req.body?.bookingId;
  if (!match || typeof id !== 'string' || !/^[a-zA-Z0-9]{15}$/.test(id)) return res.status(400).json({error:'Invalid request'});
  try {
    const client = pbClient();
    client.authStore.save(match[1], null);
    const user = (await client.collection('users').authRefresh()).record;
    const admin = await adminClient();
    const {booking, slot, service} = await getBookingWithService(admin, id);
    if (booking.user !== user.id) return res.status(403).json({error:'Not your booking'});
    if (booking.paid) return res.status(409).json({error:'Already paid'});
    if (Date.parse(slot.starts_at) <= Date.now() || !service.active || Number(service.price_eur) !== 25) return res.status(409).json({error:'Booking is not payable'});
    const session = await stripe.checkout.sessions.create({
      mode:'payment', line_items:[{price:process.env.STRIPE_PRICE_ID,quantity:1}],
      customer_email:user.email, client_reference_id:booking.id,
      metadata:{bookingId:booking.id,userId:user.id},
      success_url:`${frontend}/?payment=success#minu`, cancel_url:`${frontend}/?payment=cancelled#minu`
    });
    res.json({url:session.url});
  } catch (error) {console.error('Checkout error:',error?.message);res.status(500).json({error:'Could not start payment'});}
});
app.options('/api/checkout', (req,res) => { // OPTIONS handled separately below; no open wildcard CORS.
  if (req.get('Origin') !== frontend) return res.sendStatus(403);
  res.set({'Access-Control-Allow-Origin':frontend,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, content-type','Vary':'Origin'}).sendStatus(204);
});
const port = Number(process.env.PORT || 3000);
app.listen(port,'0.0.0.0',() => console.log(`Stripe test server listening on ${port}`));
