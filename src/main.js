import PocketBase from 'pocketbase';
import './style.css';

const pbUrl = import.meta.env.VITE_POCKETBASE_URL?.replace(/\/$/, '');
const stripeServerUrl = import.meta.env.VITE_STRIPE_SERVER_URL?.replace(/\/$/, '') || '';
const pb = pbUrl ? new PocketBase(pbUrl) : null;
if (pb) pb.autoCancellation(false);
const app = document.querySelector('#app');
const state = { services: [], slots: [], bookings: [], service: '', mode: 'login', busy: false };
const pad = n => String(n).padStart(2, '0');
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = value => new Intl.DateTimeFormat('et-EE', {weekday:'short', day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Tallinn'}).format(new Date(value));
const euro = value => `${Number(value).toFixed(2).replace('.', ',')} €`;
const loggedIn = () => !!pb?.authStore.isValid && !!pb?.authStore.record;
function notice(message, kind='info') {
  let element = document.querySelector('#notice');
  if (!element) return;
  element.textContent = message;
  element.className = `notice ${kind}`;
  element.hidden = false;
}
function messageFrom(error) {
  if (error?.status === 0) return 'Ühendus serveriga puudub. Kontrolli PocketBase aadressi ja HTTPS-sertifikaati.';
  if (error?.status === 400) return 'Andmeid ei saanud salvestada. Kontrolli sisestust või vali teine vaba aeg.';
  if (error?.status === 401 || error?.status === 403) return 'Ligipääs puudub. Logi uuesti sisse.';
  return error?.message || 'Midagi läks valesti. Proovi uuesti.';
}
function header() {
  return `<header class="site-header"><a class="brand" href="#home" aria-label="Stuudio Aeg avaleht"><span class="brand-mark">✳</span><span>stuudio<span class="brand-accent">aeg.</span></span></a><nav><a href="#teenused">Teenused</a><a href="#broneeri">Broneeri</a><a href="#minu">Minu ajad</a></nav><div class="account">${loggedIn() ? `<span class="hello">${escapeHTML(pb.authStore.record.name || pb.authStore.record.email)}</span><button id="logout" class="btn btn-outline">Logi välja</button>` : `<button id="open-login" class="btn btn-outline">Logi sisse</button>`}</div></header>`;
}
function serviceCard(s) {
  return `<button class="service-card ${state.service === s.id ? 'selected':''}" data-service="${escapeHTML(s.id)}"><span class="service-icon">✺</span><span class="service-name">${escapeHTML(s.name)}</span><span class="service-desc">${escapeHTML(s.description || 'Personaalsed teenused ja hubane atmosfäär.')}</span><span class="service-footer"><strong>${euro(s.price_eur)}</strong><span>${Number(s.duration_min)} min →</span></span></button>`;
}
function render() {
  app.innerHTML = `${header()}<main><section class="hero" id="home"><div class="hero-copy"><div class="eyebrow"><span class="dot"></span> SALONGI ONLINE-BRONEERING</div><h1>Sinu aeg.<br/><em>Sinu hetk.</em></h1><p>Leia sobiv teenus, vali vaba aeg ja broneeri mõne hetkega. Lihtne, kiire ja mugav.</p><a class="btn btn-main" href="#broneeri">Broneeri oma aeg <span>↗</span></a><div class="hero-note"><span>✦</span> Ilu algab ajast iseendale</div></div><div class="hero-visual"><div class="abstract-art"><span class="art-ring ring-one"></span><span class="art-ring ring-two"></span><span class="art-center">Sinu<br/>hetk.</span></div><div class="float-label">✺ &nbsp; Aeg iseendale</div></div></section><section class="section" id="teenused"><div class="section-heading"><div><div class="eyebrow">01 / TEENUSED</div><h2>Vali oma teenus</h2></div><p>Hoolikalt valitud teenused sinu heaks enesetundeks.</p></div><div id="services" class="services-grid">${state.services.length ? state.services.map(serviceCard).join('') : '<div class="empty">Teenuseid pole veel lisatud. Lisa teenused PocketBase’i halduspaneelis.</div>'}</div></section><section class="booking-section" id="broneeri"><div class="booking-head"><div class="eyebrow">02 / BRONEERIMINE</div><h2>Leiame sulle sobiva aja.</h2><p>Vali teenus ja klõpsa vabal ajal. Kõik kellaajad on Eesti aja järgi.</p></div><div class="booking-panel"><div class="panel-title"><span>Vabad ajad</span><span class="legend"><i></i> Saadaval</span></div><div id="slot-list" class="slot-grid"></div><div id="booking-hint" class="booking-hint">${loggedIn() ? 'Vali teenus ning seejärel vaba aeg.' : 'Broneerimiseks logi sisse või loo konto.'}</div></div></section><section class="section my-section" id="minu"><div class="section-heading"><div><div class="eyebrow">03 / MINU BRONEERINGUD</div><h2>Minu tulevased ajad</h2></div></div><div id="my-bookings"></div></section></main><footer><span class="brand">✳ &nbsp; stuudio<span class="brand-accent">aeg.</span></span><span>Õppeprojekt · PocketBase + Coolify</span></footer><div class="notice" id="notice" hidden role="status"></div><dialog id="auth-dialog" class="auth-dialog"><form id="auth-form"><button class="close" type="button" id="close-dialog" aria-label="Sulge">×</button><div class="eyebrow">TERE TULEMAST</div><h2 id="auth-title">Logi sisse</h2><p id="auth-subtitle">Broneerimiseks kasuta oma kontot.</p><label id="name-wrap" hidden>Nimi<input id="auth-name" name="name" autocomplete="name" maxlength="100" /></label><label>E-post<input name="email" type="email" autocomplete="email" required /></label><label>Parool<input name="password" type="password" autocomplete="current-password" minlength="8" required /></label><button class="btn btn-main" id="auth-submit" type="submit">Logi sisse →</button><button class="switch-auth" id="switch-auth" type="button">Pole kontot? Registreeru</button><div class="form-error" id="auth-error" role="alert"></div></form></dialog>`;
  bindEvents();
  renderSlots(); renderBookings();
}
function renderSlots() {
  const area = document.querySelector('#slot-list'); if (!area) return;
  if (!state.service) { area.innerHTML = '<div class="empty">Vali esmalt ülevalt teenus.</div>'; return; }
  const slots = state.slots.filter(s => s.service === state.service).sort((a,b) => a.starts_at.localeCompare(b.starts_at));
  if (!slots.length) { area.innerHTML = '<div class="empty">Selle teenuse jaoks pole hetkel vabu aegu.</div>'; return; }
  area.innerHTML = slots.map(s => `<button class="slot" data-slot="${escapeHTML(s.id)}" ${!loggedIn() ? 'title="Logi esmalt sisse"' : ''}><span>◷</span> ${escapeHTML(dateLabel(s.starts_at))}</button>`).join('');
  area.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => reserve(button.dataset.slot)));
}
function renderBookings() {
  const el = document.querySelector('#my-bookings'); if (!el) return;
  if (!loggedIn()) { el.innerHTML = '<div class="empty">Oma broneeringute vaatamiseks logi sisse.</div>'; return; }
  if (!state.bookings.length) { el.innerHTML = '<div class="empty">Sul ei ole veel broneeringuid. Vali ülevalt endale sobiv aeg!</div>'; return; }
  el.innerHTML = `<div class="bookings">${state.bookings.map(b => {
    const slot = b.expand?.slot;
    const service = slot?.expand?.service;
    const canPay = stripeServerUrl && !b.paid && Number(service?.price_eur) === 25 &&
      Date.parse(slot?.starts_at || '') > Date.now();
    return `<div class="booking-item"><span class="booking-cal">▦</span><div>
      <strong>${escapeHTML(service?.name || 'Salongiteenus')}</strong>
      <span>${escapeHTML(slot?.starts_at ? dateLabel(slot.starts_at) : 'Broneeritud aeg')}</span>
      ${canPay ? `<button type="button" class="btn btn-outline" data-pay="${escapeHTML(b.id)}">Maksa 25 € (test)</button>` : ''}
    </div><span class="booking-tag">${b.paid ? 'Makstud (test)' : 'Kinnitatud · tasumata'}</span></div>`;
  }).join('')}</div>`;
}
async function reload() {
  if (!pb) { render(); notice('VITE_POCKETBASE_URL puudub. Lisa oma PocketBase aadress Coolify keskkonnamuutujatesse.', 'error'); return; }
  render();
  try {
    const [services, slots] = await Promise.all([pb.collection('services').getFullList({sort:'name'}), pb.collection('available_slots').getFullList({sort:'starts_at'})]);
    state.services = services; state.slots = slots;
    if (state.service && !services.some(s => s.id === state.service)) state.service = '';
    if (loggedIn()) {
      try {state.bookings = await pb.collection('bookings').getFullList({sort:'-created', expand:'slot,slot.service'});} catch (e) {state.bookings = []; console.error(e);}
    } else state.bookings = [];
    render();
  } catch(e) { notice(messageFrom(e), 'error'); }
}
function setAuthMode() {
  const isRegister = state.mode === 'register';
  document.querySelector('#auth-title').textContent = isRegister ? 'Loo konto' : 'Logi sisse';
  document.querySelector('#auth-subtitle').textContent = isRegister ? 'Loo konto, et saaksid oma aegu hallata.' : 'Broneerimiseks kasuta oma kontot.';
  document.querySelector('#name-wrap').hidden = !isRegister;
  document.querySelector('#auth-name').required = isRegister;
  document.querySelector('#auth-submit').textContent = isRegister ? 'Loo konto →' : 'Logi sisse →';
  document.querySelector('#switch-auth').textContent = isRegister ? 'Konto juba olemas? Logi sisse' : 'Pole kontot? Registreeru';
  document.querySelector('#auth-error').textContent = '';
}
function bindEvents() {
  document.querySelector('#open-login')?.addEventListener('click', () => document.querySelector('#auth-dialog').showModal());
  document.querySelector('#logout')?.addEventListener('click', async () => {pb.authStore.clear(); await reload(); notice('Oled välja logitud.', 'success');});
  document.querySelectorAll('[data-service]').forEach(btn => btn.addEventListener('click', () => {state.service = btn.dataset.service; document.querySelectorAll('.service-card').forEach(card => card.classList.toggle('selected',card.dataset.service===state.service)); renderSlots(); document.querySelector('#broneeri').scrollIntoView({behavior:'smooth'});}));
  document.querySelector('#close-dialog').addEventListener('click', () => document.querySelector('#auth-dialog').close());
  document.querySelector('#auth-dialog').addEventListener('click', e => {if(e.target === e.currentTarget) e.currentTarget.close();});
  document.querySelector('#switch-auth').addEventListener('click', () => {state.mode = state.mode === 'login' ? 'register' : 'login'; setAuthMode();});
  document.querySelector('#auth-form').addEventListener('submit', handleAuth);
  document.querySelector('#my-bookings').addEventListener('click', event => {
    const button = event.target.closest('[data-pay]');
    if (button) startCheckout(button.dataset.pay);
  });
}
async function handleAuth(event) {
  event.preventDefault(); if (!pb || state.busy) return;
  const data = new FormData(event.currentTarget);
  const email = String(data.get('email')).trim(), password = String(data.get('password'));
  const submit = document.querySelector('#auth-submit'); state.busy = true; submit.disabled = true;
  try {
    if (state.mode === 'register') {
      await pb.collection('users').create({name:String(data.get('name')).trim(), email, password, passwordConfirm:password});
    }
    await pb.collection('users').authWithPassword(email,password);
    document.querySelector('#auth-dialog').close(); await reload(); notice('Oled edukalt sisse logitud!', 'success');
  } catch(e) {document.querySelector('#auth-error').textContent = messageFrom(e);}
  finally {state.busy = false; submit.disabled = false;}
}
async function startCheckout(bookingId) {
  if (!pb || !loggedIn() || state.busy || !stripeServerUrl) return;
  state.busy = true;
  const button = Array.from(document.querySelectorAll('[data-pay]'))
    .find(item => item.dataset.pay === bookingId);
  if (button) button.disabled = true;
  try {
    const response = await fetch(`${stripeServerUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
      },
      body: JSON.stringify({ bookingId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Makse algatamine ebaõnnestus (${response.status}).`);
    if (typeof data.url !== 'string' || !data.url.startsWith('https://checkout.stripe.com/')) {
      throw new Error('Stripe ei tagastanud korrektset makselinki.');
    }
    window.location.assign(data.url);
  } catch (error) {
    console.error('Stripe test checkout:', error);
    notice('Testmakset ei saanud avada. Kontrolli Stripe-serveri HTTPS-sertifikaati ja ühendust.', 'error');
  } finally {
    state.busy = false;
    if (button) button.disabled = false;
  }
}

async function reserve(slotId) {
  if (!pb) return;
  if (!loggedIn()) {document.querySelector('#auth-dialog').showModal(); return;}
  if (state.busy) return;
  const slot = state.slots.find(s => s.id === slotId); if (!slot) return;
  const service = state.services.find(s => s.id === slot.service);
  if (!confirm(`Kinnita broneering: ${service?.name || 'Teenus'}\n${dateLabel(slot.starts_at)}\nHind: ${euro(service?.price_eur || 0)}\n\nSee on testprojekt — makset veel ei võeta.`)) return;
  state.busy = true;
  try {
    await pb.collection('bookings').create({user:pb.authStore.record.id,slot:slotId});
    await reload(); notice('Broneering on kinnitatud! Vaata seda jaotisest „Minu tulevased ajad”.', 'success');
  } catch(e) {await reload(); notice(e.status === 400 ? 'See aeg on juba broneeritud või pole enam saadaval. Vali teine aeg.' : messageFrom(e), 'error');}
  finally {state.busy = false;}
}
reload().then(() => {
  const payment = new URLSearchParams(window.location.search).get('payment');
  if (payment === 'success') {
    notice('Naasid Stripe testmaksest. Makse kinnitust kontrollib server; vajadusel värskenda lehte.', 'info');
  } else if (payment === 'cancelled') {
    notice('Testmakse katkestati. Broneering jäi alles.', 'info');
  }
  if (payment === 'success' || payment === 'cancelled') {
    window.history.replaceState(null, '', `${window.location.pathname}#minu`);
  }
});
