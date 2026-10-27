# Pagina "Persone" – contatti da tenere d'occhio

## Cosa vedrai
- Nuova voce **Persone** nel menu laterale.
- Elenco persone con nome, foto/iniziali, tag cliente (riusa i tag esistenti), note libere e badge "da risentire" (in ritardo / oggi / prossimi giorni).
- Scheda persona con i suoi **canali**: Instagram, LinkedIn, X, TikTok, Facebook, email, telefono, WhatsApp, Telegram, altro. Ogni canale è un link cliccabile (apre profilo, mail, chiamata o chat WhatsApp/Telegram).
- **Promemoria per risentirli**, entrambi i modi:
  - "Ogni X giorni" dall'ultimo contatto (es. 30).
  - Data specifica scelta a mano (ha la precedenza se impostata).
- Pulsante **"Contattato oggi"**: registra il contatto (canale + nota breve) e ricalcola la prossima data.
- Storico contatti per ogni persona.
- Filtri: da risentire, per tag, ricerca per nome.
- Le persone da risentire compaiono anche come promemoria nel **calendario** e arrivano come **notifica push** alle 09:00 del giorno previsto (dentro la fascia 08:00–20:00 già attiva).

## Dettagli tecnici
- Nuove tabelle (stesso modello single-user, policy aperte come le altre):
  - `people`: name, avatar_url, client_tag_id, notes, recontact_every_days (nullable), next_contact_date (nullable, manuale), last_contacted_at, timestamps.
  - `person_channels`: person_id, kind (instagram/linkedin/x/tiktok/facebook/email/phone/whatsapp/telegram/other), value, label.
  - `person_contacts`: person_id, contacted_at, channel_kind, note.
- Data di scadenza calcolata: next_contact_date se presente, altrimenti last_contacted_at + recontact_every_days.
- Notifiche: all'aggiornamento della persona si inserisce/aggiorna una riga in `reminder_queue` (fire_at = giorno scadenza 09:00 Rome); il dispatcher a 30 minuti esistente la invia. Serve rendere `task_id` opzionale e aggiungere `person_id`.
- Frontend: `src/pages/PeoplePage.tsx`, `PersonDialog`, `usePeople` hook (React Query), voce in `AppSidebar`, route `/people`; nel calendario un indicatore giornaliero "da risentire".
- Test vitest per il calcolo della prossima data di contatto.
