# Stuudio Aeg – juuksurisalongi broneerimissüsteem

**Stuudio Aeg** on õppeprojektina loodud veebipõhine juuksurisalongi broneerimissüsteem. Klient saab registreeruda, sisse logida, tutvuda teenuste ja hindadega, valida vaba aja, teha broneeringu, vaadata oma tulevasi broneeringuid ning tasuda teenuse eest Stripe'i testkeskkonnas.

**GitHub:** https://github.com/vTyzee/emil-booking-saas

**Töötav veebirakendus:** http://aollv8orsbrbhkwyc53qzhjr.176.112.158.15.sslip.io/

**Projekti tüüp:** õppeprojekt / MVP (minimaalne töötav lahendus)

## 1. Projekti eesmärk

Projekti eesmärk on luua juuksurisalongile lihtne veebirakendus, mille kaudu klient saab sobiva teenuse ja vaba aja ise valida ning broneeringu teha.

Rakendus kuvab tulevasi vabu aegu. Pärast broneeringu tegemist ei pakuta sama aega järgmisele kliendile enam vabade aegade nimekirjas.

Klient saab näha oma broneeringuid ja tasuda broneeritud teenuse eest Stripe'i testmaksega. Salongi administraator saab PocketBase'i halduspaneelis hallata teenuseid, broneerimisaegu ja broneeringuid.

## 2. Kasutatud tehnoloogiad

| Tehnoloogia                   | Kasutus                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| Vite, HTML, CSS ja JavaScript | Veebirakenduse kasutajaliides                                     |
| PocketBase                    | Andmebaas, autentimine ja API                                     |
| Node.js ja Express            | Stripe'i maksete serveripoolne töötlemine                         |
| Stripe Checkout               | Testmakse tegemine                                                |
| Stripe webhook                | Makse kinnituse vastuvõtmine ja broneeringu makseoleku uuendamine |
| Git ja GitHub                 | Lähtekoodi versioonihaldus                                        |
| Coolify ja Docker             | Rakenduse juurutamine ja käitamine                                |

## 3. Teostatud funktsioonid

* Kasutaja registreerimine e-posti ja parooliga ning sisselogimine.
* Salongiteenuste, hindade ja kestuse kuvamine.
* Vabade tulevaste aegade kuvamine.
* Teenuse ja vaba aja valimine.
* Broneeringu loomine ja kuvamine kliendi isiklikus vaates.
* Juba broneeritud aja eemaldamine vabade aegade nimekirjast.
* Broneeringute kasutajapõhised ligipääsureeglid.
* Sama aja topeltbroneerimise piiramine.
* Stripe Checkouti avamine konkreetse broneeringu eest tasumiseks.
* Stripe'i testmakse kinnituse vastuvõtmine webhooki kaudu.
* Eduka makse korral broneeringu märkimine tasutuks PocketBase'is.
* Tasutud broneeringu kuvamine kliendile olekuga **„Makstud (test)”**.

**Oluline:** Stripe töötab projektis testkeskkonnas (*Sandbox*). Pärisraha ei võeta ja tegelikke pangamakseid ei tehta.

## 4. Kasutusjuhend kliendile

1. Ava veebirakendus.
2. Vajuta **„Logi sisse”** ja logi olemasoleva kontoga sisse või loo uus konto.
3. Vali jaotisest **„Teenused”** soovitud teenus.
4. Vali jaotisest **„Broneerimine”** sobiv vaba aeg.
5. Kinnita broneering.
6. Ava **„Minu ajad”**, kus kuvatakse sinu broneeringud.
7. Tasumata broneeringu juures vajuta **„Maksa 25 € (test)”**.
8. Tee Stripe'i testkeskkonnas makse.
9. Pärast makset naase rakendusse. Kui server on Stripe'i maksekinnituse töötlenud, kuvatakse broneeringu juures **„Makstud (test)”**.

Kui aeg on juba broneeritud, ei kuvata seda enam järgmisele kliendile vabade aegade seas.

## 5. Andmemudel

PocketBase'is kasutatakse järgmisi kollektsioone:

| Kollektsioon      | Otstarve                                | Peamised väljad                                              |
| ----------------- | --------------------------------------- | ------------------------------------------------------------ |
| `users`           | Klientide kontod ja autentimine         | `email`, `password`, `name`                                  |
| `services`        | Salongi teenused                        | `name`, `description`, `price_eur`, `duration_min`, `active` |
| `slots`           | Broneerimiseks määratud ajad            | `service`, `starts_at`, `ends_at`                            |
| `bookings`        | Klientide broneeringud ja makseolek     | `user`, `slot`, `created`, `paid`, `stripe_session_id`       |
| `available_slots` | Vabade tulevaste aegade andmebaasivaade | `service`, `starts_at`, `ends_at`                            |

`bookings.user` viitab kollektsioonile `users` ja `bookings.slot` kollektsioonile `slots`. Iga broneeritav aeg on seotud kindla teenusega.

Välja `bookings.slot` unikaalsuspiirang on mõeldud sama ajavahemiku topeltbroneerimise vältimiseks.

Maksetega seotud väljade tähendus:

* `paid` – näitab, kas broneering on tasutud.
* `stripe_session_id` – salvestab broneeringuga seotud Stripe Checkouti seansi identifikaatori.

Makseoleku muutmise eest vastutab server, mitte kliendi brauser.

## 6. Ligipääsuõigused

PocketBase'i API reeglid piiravad ligipääsu broneeringutele.

Sisselogitud klient saab vaadata enda broneeringuid ja luua broneeringu oma kasutajakontoga. Teise kasutaja broneeringute vaatamine ning broneeringute muutmine või kustutamine ei ole tavakliendile lubatud.

Teenuste ja broneerimisaegade haldamine toimub PocketBase'i administraatori kaudu.

Stripe'i server kontrollib enne makse algatamist kasutaja autentimist ning seda, kas broneering kuulub sisselogitud kasutajale. Makse kinnitamisel kontrollib server Stripe'i webhooki allkirja ja makseandmeid ning uuendab seejärel broneeringu makseolekut.

## 7. Tehniline arhitektuur

Rakendus koosneb **kolmest Coolify ressursist**.

### 7.1. Frontend

Frontend on Vite'i abil loodud staatiline veebirakendus, mille lähtekood asub GitHubis.

Frontend suhtleb PocketBase'iga JavaScript SDK kaudu. Stripe'i testmakse alustamiseks saadab frontend päringu eraldi Expressi serverile.

Frontendi keskkonnamuutujad:

* `VITE_POCKETBASE_URL` – PocketBase'i avalik aadress.
* `VITE_STRIPE_SERVER_URL` – Stripe'i serveri avalik aadress.

Need muutujad määratakse Coolifys **Buildtime** jaoks, sest Vite lisab nende väärtused veebirakenduse ehitamisel loodud failidesse.

### 7.2. PocketBase

PocketBase pakub kasutajate autentimist, andmebaasi, API-t ja administraatori halduspaneeli.

PocketBase kasutab püsivat Docker volume'it kataloogi `/app/pb_data` jaoks, et andmed säiliksid ka konteineri taaskäivitamisel.

### 7.3. Stripe'i server

Stripe'i server asub GitHubi repositooriumi kaustas `stripe-server` ning töötab Coolifys eraldi Node.js/Expressi rakendusena.

Serveri peamised otspunktid:

| Otspunkt               | Otstarve                                                     |
| ---------------------- | ------------------------------------------------------------ |
| `GET /health`          | Serveri töötamise kontroll                                   |
| `POST /api/checkout`   | Konkreetse broneeringu jaoks Stripe Checkouti seansi loomine |
| `POST /stripe/webhook` | Stripe'i maksekinnituste vastuvõtmine                        |

Testitud serveri tervisekontrolli vastus:

```json
{"ok":true}
```

Stripe'i server kasutab PocketBase'i administraatori õigusi ainult serveripoolselt. Administraatori parooli ja Stripe'i salajasi API-võtmeid ei lisata frontendi lähtekoodi ega avalikku GitHubi repositooriumi.

## 8. Kohalik käivitamine

### 8.1. Frontend

Klooni projekt ja paigalda sõltuvused:

```bash
git clone https://github.com/vTyzee/emil-booking-saas.git
cd emil-booking-saas
npm install
```

Loo projektikausta fail `.env` ja määra kasutatavate teenuste aadressid:

```env
VITE_POCKETBASE_URL=https://SINU-POCKETBASE-AADRESS
VITE_STRIPE_SERVER_URL=https://SINU-STRIPE-SERVERI-AADRESS
```

Käivita frontend:

```bash
npm run dev
```

Broneerimisfunktsioonide kasutamiseks peab PocketBase töötama ning vajalikud kollektsioonid, API reeglid ja teenuste andmed olema seadistatud.

### 8.2. Stripe'i server

Stripe'i serveri lähtekood asub kaustas `stripe-server`.

```bash
cd stripe-server
npm install
npm start
```

Enne käivitamist tuleb serveri keskkonnas määrata järgmised muutujad:

| Muutuja                 | Otstarve                                      |
| ----------------------- | --------------------------------------------- |
| `PORT`                  | Serveri port; Coolify seadistuses `3000`      |
| `STRIPE_SECRET_KEY`     | Stripe'i testkeskkonna salajane API-võti      |
| `STRIPE_WEBHOOK_SECRET` | Stripe'i webhooki allkirja kontrollimise võti |
| `STRIPE_PRICE_ID`       | Stripe'i teenuse hinna identifikaator         |
| `PB_URL`                | PocketBase'i aadress                          |
| `PB_ADMIN_EMAIL`        | PocketBase'i administraatori e-post           |
| `PB_ADMIN_PASSWORD`     | PocketBase'i administraatori parool           |
| `FRONTEND_ORIGIN`       | Lubatud frontendi päritoluaadress             |

Salajased võtmed ja paroolid peavad jääma ainult serveri keskkonda. Neid ei tohi lisada GitHubi ega `VITE_*` muutujatesse.

## 9. Juurutamine Coolify abil

Projekt on juurutatud Coolify keskkonnas kolme eraldi ressursina.

### Frontendi seadistused

* **Repository:** `vTyzee/emil-booking-saas`
* **Branch:** `main`
* **Build strategy:** Railpack
* **Site type:** Static
* **Build command:** `npm run build`
* **Publish directory:** `/dist`
* **Buildtime muutujad:** `VITE_POCKETBASE_URL` ja `VITE_STRIPE_SERVER_URL`

Pärast frontendi lähtekoodi või `VITE_*` muutujate muutmist tuleb rakendus uuesti ehitada ja juurutada.

### PocketBase'i seadistused

PocketBase töötab samas Coolify projektis eraldi teenusena. Andmebaasi jaoks kasutatakse püsivat Docker volume'it.

Teenuseid ja vabu aegu saab hallata PocketBase'i administraatori kaudu.

### Stripe'i serveri seadistused

* **Repository:** `vTyzee/emil-booking-saas`
* **Branch:** `main`
* **Base directory:** `/stripe-server`
* **Build strategy:** Railpack
* **Site type:** Dynamic
* **Port:** `3000`
* **Start command:** `npm start`
* **Keskkonnamuutujad:** serveri tööks vajalikud Stripe'i ja PocketBase'i muutujad

Stripe'i Sandboxis on loodud webhook, mis saadab maksesündmused serveri otspunkti `/stripe/webhook`.

Webhook kuulab sündmusi:

* `checkout.session.completed`
* `checkout.session.async_payment_succeeded`

Webhooki allkirja kontrollimiseks kasutatakse serveri keskkonnamuutujat `STRIPE_WEBHOOK_SECRET`.

## 10. Testimine

Rakendust testiti pärast Coolifys juurutamist.

| Test                                                      | Tulemus                                              |
| --------------------------------------------------------- | ---------------------------------------------------- |
| Veebirakenduse avamine                                    | Õnnestus                                             |
| Kasutaja registreerimine ja sisselogimine                 | Õnnestus                                             |
| Teenuse, hinna ja kestuse kuvamine                        | Õnnestus                                             |
| Vaba aja kuvamine                                         | Õnnestus                                             |
| Broneeringu loomine ja PocketBase'i salvestamine          | Õnnestus                                             |
| Broneeringu kuvamine jaotises „Minu ajad”                 | Õnnestus                                             |
| Juba broneeritud aja eemaldamine vabade aegade hulgast    | Õnnestus                                             |
| Sama aja broneerimise katse teise kasutajaga              | Aeg ei olnud enam vabade aegade nimekirjas           |
| Broneeringu säilimine pärast PocketBase'i taaskäivitamist | Õnnestus                                             |
| Stripe'i serveri tervisekontroll `/health`                | Tagastas `{"ok":true}`                               |
| Stripe Checkouti avamine broneeringu juurest              | Õnnestus                                             |
| Stripe'i testmakse summas 25 €                            | Õnnestus                                             |
| Tasutud broneeringu kuvamine veebirakenduses              | Kuvati „Makstud (test)”                              |
| Makseoleku salvestamine PocketBase'i                      | `paid = true` ja `stripe_session_id` oli salvestatud |

Testimiseks loodi teenus **„Meeste juukselõikus”**, mille hind on **25 €** ja kestus **30 minutit**. Rakenduses loodi testkasutajad ja broneeringud ning kontrolliti broneeritud aegade kuvamist.

Stripe'i testmakse järel kontrolliti PocketBase'i `bookings` kollektsioonis, et tasutud broneeringu `paid` väärtus oli `true` ja `stripe_session_id` oli täidetud. See kinnitas, et makseolek jõudis serveri kaudu andmebaasi.

Testimisel kasutati ainult Stripe'i testkeskkonda ja testkaarti. Pärisraha ei kasutatud.

## 11. Piirangud ja edasiarendus

Praegune versioon on õppeprojektina loodud MVP, mitte pärisklientidele mõeldud tootmiskeskkond.

Selles versioonis ei ole realiseeritud Google'i või GitHubi kaudu sisselogimist, kliendipoolset broneeringu tühistamist, töötajate eraldi kalendreid ega automaatseid e-kirja või SMS-i teavitusi.

Stripe'i maksed töötavad ainult testkeskkonnas. Pärismaksete vastuvõtmist ei ole aktiveeritud.

Õppekeskkonna automaatselt genereeritud domeenidel võib brauser kuvada HTTPS-sertifikaadi hoiatust; testimisel kuvati Stripe'i serveri domeenil **„TRAEFIK DEFAULT CERT”**. Enne rakenduse kasutamist pärisklientidega tuleb seadistada kehtivad HTTPS-sertifikaadid, täiendada serveripoolset valideerimist ning lisada varundus- ja turvameetmed.

Edasiarendusena saaks lisada makse tagastamise ja broneeringu tühistamise, mitme töötaja graafikud, e-posti teavitused ning salongi administraatorile eraldi kasutajaliidese.

## 12. Kokkuvõte

Projektis loodi ja juurutati juuksurisalongi veebipõhine broneerimissüsteem. Rakendus ühendab Vite'i kasutajaliidese, PocketBase'i autentimise ja andmebaasi ning eraldi Expressi serveri kaudu Stripe'i testmaksed.

Kontrollitud on kasutajakonto loomist, broneeringu tegemist, broneeringu andmete säilimist ning testmakse kinnituse salvestamist PocketBase'i. Projekt demonstreerib veebirakenduse loomist, mitme teenuse ühendamist ja juurutamist Coolify abil.
