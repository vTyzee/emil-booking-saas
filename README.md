
# Stuudio Aeg – juuksurisalongi broneerimissüsteem

Stuudio Aeg on õppeprojektina loodud veebipõhine broneerimissüsteem juuksurisalongile. Klient saab registreeruda, sisse logida, tutvuda teenuste ja hindadega, valida vaba aja, teha broneeringu ning vaadata oma tulevasi broneeringuid.

**GitHub:** https://github.com/vTyzee/emil-booking-saas

**Töötav veebirakendus:** http://aollv8orsbrbhkwyc53qzhjr.176.112.158.15.sslip.io/

## 1. Projekti eesmärk

Projekti eesmärk on luua juuksurisalongile lihtne veebirakendus, mis võimaldab klientidel broneerida teenuseid internetis. Klient näeb vabu aegu ja saab sobiva aja ise valida. Juba broneeritud aega ei pakuta järgmisele kliendile uuesti.

Salongi administraator saab PocketBase'i halduspaneelis hallata teenuseid ja broneerimiseks pakutavaid aegu.

## 2. Kasutatud tehnoloogiad

- **Frontend:** Vite, HTML, CSS ja JavaScript
- **Backend ja andmebaas:** PocketBase
- **Autentimine:** PocketBase'i e-posti ja parooliga autentimine
- **Versioonihaldus:** Git ja GitHub
- **Juurutamine:** Coolify ja Docker

Frontend ja PocketBase töötavad Coolify's eraldi teenustena. Frontend suhtleb PocketBase'iga API kaudu. PocketBase'i andmed salvestatakse püsivasse Docker volume'isse, et need ei kaoks konteineri taaskäivitamisel.

## 3. Teostatud funktsioonid

- Kasutaja registreerimine ja sisselogimine
- Salongiteenuste, hindade ja kestuse kuvamine
- Vabade aegade kuvamine
- Sobiva teenuse ja aja valimine
- Broneeringu loomine
- Kasutaja tulevaste broneeringute kuvamine
- Broneeritud aja eemaldamine vabade aegade nimekirjast
- Kasutajapõhised ligipääsureeglid broneeringutele
- Sama aja topeltbroneerimise piiramine andmebaasi tasemel

## 4. Kasutamine

1. Ava veebirakendus.
2. Registreeru või logi olemasoleva kontoga sisse.
3. Vali sobiv juuksurisalongi teenus.
4. Vali teenuse jaoks pakutav vaba aeg.
5. Kinnita broneering.
6. Vaata oma broneeringut jaotisest **„Minu tulevased ajad“**.

Kui aeg on juba broneeritud, ei kuvata seda enam vabade aegade nimekirjas.

## 5. Andmemudel

PocketBase'is kasutatakse järgmisi kollektsioone:

| Kollektsioon | Otstarve | Peamised väljad |
|---|---|---|
| `users` | Klientide kontod ja autentimine | `email`, `password`, `name` |
| `services` | Salongi teenused | `name`, `description`, `price_eur`, `duration_min`, `active` |
| `slots` | Broneerimiseks määratud ajad | `service`, `starts_at`, `ends_at` |
| `bookings` | Klientide broneeringud | `user`, `slot`, `created` |
| `available_slots` | Vabade tulevaste aegade vaade | `service`, `starts_at`, `ends_at` |

`bookings.user` viitab kollektsioonile `users` ja `bookings.slot` kollektsioonile `slots`. Iga aeg on seotud kindla teenusega.

Kollektsioonile `bookings` on lisatud unikaalsuspiirang välja `slot` järgi, et ühe aja kohta ei saaks salvestada mitut broneeringut.

## 6. Ligipääsuõigused

PocketBase'i API reeglid piiravad ligipääsu broneeringutele.

Sisselogitud klient saab vaadata enda broneeringuid ja luua broneeringu oma kasutajakontoga. Teise kasutaja broneeringute vaatamine ning broneeringute muutmine või kustutamine ei ole kliendile lubatud.

Teenuste ja broneerimisaegade haldamine toimub PocketBase'i administraatori kaudu.

## 7. Tehniline arhitektuur

Rakendus koosneb kahest Coolify ressursist:

**Frontend**

- Lähtekood asub GitHubi repositooriumis.
- Coolify loob Vite'i abil staatilise veebirakenduse.
- Rakendus suhtleb PocketBase'iga JavaScript SDK ja API kaudu.
- PocketBase'i aadress antakse frontendile ehitamise ajal keskkonnamuutujaga `VITE_POCKETBASE_URL`.

**PocketBase**

- Pakub autentimist, andmebaasi ja API-t.
- Hoiab kasutajate, teenuste, aegade ja broneeringute andmeid.
- Kasutab andmete säilitamiseks Docker volume'it.
- Võimaldab administraatoril hallata kollektsioone ja API reegleid.

## 8. Kohalik käivitamine

Klooni projekt ja ava selle kaust:

```bash
git clone https://github.com/vTyzee/emil-booking-saas.git
cd emil-booking-saas
npm install
```

Loo projektikausta fail `.env` ja määra PocketBase'i aadress:

```env
VITE_POCKETBASE_URL=https://SINU-POCKETBASE-AADRESS
```

Käivita frontend:

```bash
npm run dev
```

Rakenduse broneerimisfunktsioonide kasutamiseks peab PocketBase olema käivitatud ning vajalikud kollektsioonid, API reeglid ja näidisandmed seadistatud.

PocketBase'i administraatori e-posti, parooli ega autentimistokeneid ei tohi lisada GitHubi, `.env` faili `VITE_*` muutujatesse ega frontendi lähtekoodi.

## 9. Juurutamine Coolify abil

Projekt on juurutatud Coolify keskkonnas.

Frontendi seadistused:

- **GitHubi repositoorium:** `vTyzee/emil-booking-saas`
- **Branch:** `main`
- **Build strategy:** Railpack
- **Site type:** Static
- **Build command:** `npm run build`
- **Publish directory:** `/dist`
- **Keskkonnamuutuja:** `VITE_POCKETBASE_URL`

PocketBase töötab samas Coolify projektis eraldi teenusena. Andmebaas kasutab püsivat salvestusruumi.

Pärast juurutamist avati rakendus veebibrauseris ning kontrolliti selle ühendust PocketBase'iga.

## 10. Testimine

Rakendust testiti pärast Coolify's juurutamist.

| Test | Tulemus |
|---|---|
| Veebirakenduse avamine | Õnnestus |
| Kasutaja registreerimine ja sisselogimine | Õnnestus |
| Teenuse ja hinna kuvamine | Õnnestus |
| Vaba aja kuvamine | Õnnestus |
| Broneeringu loomine | Õnnestus |
| Broneeringu salvestamine PocketBase'i | Õnnestus |
| Broneeringu kuvamine jaotises „Minu tulevased ajad“ | Õnnestus |
| Juba broneeritud aja eemaldamine vabade aegade hulgast | Õnnestus |
| Teise kasutajaga sama aja broneerimise kontroll | Aeg ei olnud enam broneerimiseks saadaval |

Testimiseks loodi teenus **„Meeste juukselõikus“**, mille hind on **25 €** ja kestus **30 minutit**. Teenusele lisati vaba aeg **23.09.2026 kell 10.00**. Testkasutaja broneeris selle aja ning broneering ilmus tema tulevaste aegade nimekirja.

## 11. Piirangud ja edasiarendus

Praegune versioon on õppeprojektina loodud MVP ehk minimaalne töötav lahendus.

Selles versioonis **ei ole realiseeritud**:

- Google'i või GitHubi kaudu sisselogimist;
- Stripe'i makseid;
- broneeringu tühistamist kliendi poolt;
- töötajate eraldi kalendreid;
- automaatseid e-kirja või SMS-i teavitusi.

Rakenduses ei tehta päris makseid.

Enne tegelikus juuksurisalongis kasutamist tuleks seadistada usaldusväärne HTTPS nii frontendile kui ka PocketBase'ile, täiendada serveripoolset valideerimist, kontrollida andmete säilimist pärast taaskäivitamist ning lisada vajalikud turva- ja varunduslahendused.

Projekt demonstreerib veebirakenduse loomist, PocketBase'i kasutamist andmebaasi ja autentimiseks ning rakenduse juurutamist Coolify abil.
