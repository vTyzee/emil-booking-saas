/**
 * Run LOCALLY by the project's administrator AFTER PocketBase HTTPS is trusted.
 * The superuser password is read from the local environment, never from Vite.
 * Idempotent: existing collections aren't overwritten.
 */
import PocketBase from 'pocketbase';
const url = process.env.PB_URL;
const email = process.env.PB_ADMIN_EMAIL;
const password = process.env.PB_ADMIN_PASSWORD;
if (!url || !email || !password) {
  console.error('Missing PB_URL, PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD. See README.md.');
  process.exit(1);
}
if (!url.startsWith('https://') && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error('PB_URL must use trusted HTTPS (or localhost for local development).');
  process.exit(1);
}
const pb = new PocketBase(url);
pb.autoCancellation(false);
try { await pb.collection('_superusers').authWithPassword(email, password); }
catch(e) { console.error('Superuser sign-in failed. Check HTTPS, credentials and account setup.'); process.exit(1); }
async function ensure(name, create) {
  try {const found = await pb.collections.getOne(name); console.log(`Existing collection: ${name}`); return found;}
  catch(e) {if(e.status !== 404) throw e; const result = await pb.collections.create(create); console.log(`Created collection: ${name}`); return result;}
}
const users = await ensure('users', {
  name:'users', type:'auth',
  listRule:'id = @request.auth.id', viewRule:'id = @request.auth.id',
  createRule:'', updateRule:'id = @request.auth.id && @request.body.role:isset = false', deleteRule:null,
  fields:[{name:'name',type:'text',required:true,max:100}],
  passwordAuth:{enabled:true,identityFields:['email']}
});
const services = await ensure('services', {
  name:'services',type:'base',listRule:'active = true',viewRule:'active = true',
  createRule:null,updateRule:null,deleteRule:null,
  fields:[
    {name:'name',type:'text',required:true,max:100},
    {name:'description',type:'text',max:500},
    {name:'price_eur',type:'number',required:true,min:0,max:10000},
    {name:'duration_min',type:'number',required:true,min:15,max:480},
    {name:'active',type:'bool'},
  ]
});
const slots = await ensure('slots', {
  name:'slots',type:'base',listRule:null,viewRule:null,createRule:null,updateRule:null,deleteRule:null,
  fields:[
    {name:'service',type:'relation',required:true,maxSelect:1,collectionId:services.id},
    {name:'starts_at',type:'date',required:true},
    {name:'ends_at',type:'date',required:true},
  ],
  indexes:['CREATE UNIQUE INDEX idx_slots_service_starts ON slots (service, starts_at)']
});
const bookings = await ensure('bookings', {
  name:'bookings',type:'base',
  listRule:'@request.auth.id != "" && user = @request.auth.id',
  viewRule:'@request.auth.id != "" && user = @request.auth.id',
  createRule:'@request.auth.id != "" && user = @request.auth.id && @request.body.user = @request.auth.id',
  updateRule:null,deleteRule:null,
  fields:[
    {name:'user',type:'relation',required:true,maxSelect:1,collectionId:users.id},
    {name:'slot',type:'relation',required:true,maxSelect:1,collectionId:slots.id},
  ],
  indexes:['CREATE UNIQUE INDEX idx_booking_unique_slot ON bookings (slot)']
});
await ensure('available_slots', {
  name:'available_slots',type:'view',listRule:'',viewRule:'',
  viewQuery:`SELECT s.id AS id, s.service AS service, s.starts_at AS starts_at, s.ends_at AS ends_at
    FROM slots s JOIN services srv ON srv.id = s.service
    WHERE srv.active = 1 AND s.starts_at > datetime('now')
      AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot = s.id)`
});
const demo = [
  ['Juukselõikus','Personaalne lõikus ja viimistlus.',35,45],
  ['Juuste värvimine','Värskenda oma stiili professionaalse värviga.',75,90],
  ['Soeng ja viimistlus','Eriline soeng igaks sündmuseks.',45,60],
];
for (const [name,description,price_eur,duration_min] of demo) {
  const found = await pb.collection('services').getList(1,1,{filter:pb.filter('name = {:name}',{name})});
  if(!found.totalItems) { await pb.collection('services').create({name,description,price_eur,duration_min,active:true}); console.log(`Created service: ${name}`); }
}
// Example appointment times are generated for the next two weeks in Tallinn local business hours.
// A real salon administrator should replace these demo slots with actual availability.
const s = await pb.collection('services').getFullList();
const current = new Date();
const fmt = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Tallinn',year:'numeric',month:'2-digit',day:'2-digit'});
for(let offset=1;offset<=14;offset++) {
  const day=new Date(current.getTime()+offset*86400000);
  const localDay=fmt.format(day);
  const weekday=new Date(`${localDay}T12:00:00Z`).getUTCDay();
  if(weekday === 0 || weekday === 6) continue;
  for(let i=0;i<s.length;i++) for(const hour of [10,12,14,16]) {
    // These are fixed UTC values representing approx. 10/12/14/16 Tallinn summer hours;
    // actual appointment strings are generated as local times via explicit zone conversion below.
    const startLocal=`${localDay}T${String(hour).padStart(2,'0')}:00:00`;
    const fakeUtc = new Date(`${startLocal}Z`);
    const tallinnHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Tallinn',hour:'2-digit',hourCycle:'h23'}).format(fakeUtc));
    const utcHour=hour-((tallinnHour-hour+24)%24);
    const start=new Date(`${localDay}T00:00:00Z`);
    start.setUTCHours(utcHour,0,0,0);
    const end=new Date(start.getTime()+s[i].duration_min*60000);
    const filter=pb.filter('service = {:service} && starts_at = {:start}',{service:s[i].id,start:start.toISOString()});
    const existing=await pb.collection('slots').getList(1,1,{filter});
    if(!existing.totalItems) await pb.collection('slots').create({service:s[i].id,starts_at:start.toISOString(),ends_at:end.toISOString()});
  }
}
console.log('Booking setup complete. Verify API rules and availability in PocketBase Admin.');
