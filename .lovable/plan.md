# Reminder affidabili con Web Push

## Perché oggi non funzionano

I reminder sono pianificati con `setTimeout` dentro la pagina (`src/hooks/useReminders.ts`). Quando l'app è chiusa o il telefono è in standby, JS viene sospeso e il timer non scatta mai. La notifica "test" da Settings funziona solo perché viene mostrata immediatamente a app aperta.

La soluzione: **Web Push** server-side. Il browser/PWA registra una "subscription" presso il push service del sistema (FCM su Android, APNs su iOS 16.4+, Mozilla autopush su Firefox). Una funzione schedulata su Lovable Cloud controlla i reminder dovuti e invia il push, che il sistema operativo consegna anche ad app chiusa.

## Cosa costruiamo

### 1. Chiavi VAPID

Genero una coppia di chiavi VAPID e le salvo come secret di Lovable Cloud:

- `VAPID_PUBLIC_KEY` (verrà esposta lato client)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (es. `mailto:tu@dominio.com`)

### 2. Database

Nuova tabella `push_subscriptions`:

- `id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`, `last_seen_at`

Nuova tabella `reminder_queue` (riempita lato client quando una task ha `reminder_minutes`):

- `id`, `task_id`, `fire_at` (timestamptz), `title`, `body`, `tag`, `sent_at`, `created_at`
- Indice su `(sent_at, fire_at)` per la cron query.

### 3. Service Worker (`public/sw.js`)

Aggiungo:

- `push` event listener → `self.registration.showNotification(...)` con titolo, corpo, tag, icon, data.
- `notificationclick` già presente: porta su `/`.

### 4. Frontend

- `**src/hooks/usePushSubscription.ts**`: registra il SW (già esiste registrazione), chiama `pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })`, salva la subscription via edge function `push-subscribe`. Esposto un toggle "Abilita notifiche push" in Settings.
- `**src/pages/SettingsPage.tsx**`: nel pannello Notifications aggiungo bottone "Enable push notifications" + stato.
- `**src/hooks/useReminders.ts**`: rimuovo i `setTimeout`. Al posto, ogni volta che le task cambiano, sincronizzo la `reminder_queue`: per ogni task con `scheduled_date + scheduled_start_time + reminder_minutes` calcolo `fire_at = start − lead` e faccio upsert (chiave logica `task_id + fire_at`). Se la task viene cancellata o l'orario cambia, riallineo (delete+insert).
- Mantengo il toast in-app come fallback se la pagina è aperta.

### 5. Edge Functions

- `**push-subscribe**` (POST): riceve la subscription, la salva/aggiorna in `push_subscriptions`.
- `**push-unsubscribe**` (POST): rimuove la subscription.
- `send-due-reminders` (cron, ogni ora): seleziona `reminder_queue` con `sent_at IS NULL AND fire_at <= now() AND fire_at > now() - interval '60 min'`; per ogni riga, invia un push a tutte le subscription attive usando VAPID (libreria `npm:web-push@3` da Deno via `npm:` import). Marca `sent_at = now()`. Se una subscription risponde 404/410, la elimina.

### 6. Cron

Schedulazione `pg_cron` ogni ora che invoca `send-due-reminders` (autenticata con anon key).

## Limiti da comunicare all'utente

- **iOS**: Web Push funziona **solo se l'app è installata in Home Screen** (Aggiungi alla schermata Home) su iOS 16.4+. In Safari "normale" non funziona — è un limite di Apple.
- **Android**: funziona sia da PWA installata sia da Chrome.
- Se l'utente disinstalla la PWA o cambia browser, dovrà riabilitare le notifiche dalle Impostazioni dell'app.

## Dettagli tecnici

- `web-push` per Deno: `import webpush from "npm:web-push@3.6.7"` con `webpush.setVapidDetails(...)` e `webpush.sendNotification(subscription, JSON.stringify(payload))`.
- Payload push: `{ title, body, tag, data: { url: "/" } }`.
- Riallineamento queue lato client: per evitare duplicati uso `upsert` su `(task_id, fire_at)` con `onConflict`.
- Pulizia: cron secondaria settimanale (o nella stessa funzione) rimuove righe con `sent_at` più vecchio di 30 giorni.
- La VAPID public key viene esposta come variabile pubblica via una funzione `get-vapid-public-key` o salvata in `user_settings`/secret pubblico letto al primo subscribe.

## File toccati

Nuovi:

- `supabase/functions/push-subscribe/index.ts`
- `supabase/functions/push-unsubscribe/index.ts`
- `supabase/functions/send-due-reminders/index.ts`
- `supabase/functions/get-vapid-public-key/index.ts`
- `src/hooks/usePushSubscription.ts`
- migration: tabelle `push_subscriptions`, `reminder_queue` + cron job

Modificati:

- `public/sw.js` (handler `push`)
- `src/hooks/useReminders.ts` (sync queue, niente più setTimeout)
- `src/pages/SettingsPage.tsx` (toggle push)

## Cosa ti chiederò durante l'implementazione

Dopo l'approvazione del piano: il valore di `VAPID_SUBJECT` (un indirizzo email di contatto, richiesto dallo standard VAPID — può essere il tuo).