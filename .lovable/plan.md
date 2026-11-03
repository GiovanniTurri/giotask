# Copiare le task in un solo calendario Google

## Come funziona oggi
- Per ogni account Google collegato c'è un interruttore "Copia task" e un calendario di destinazione (di default il principale).
- Le task vengono scritte su **ogni account** con l'interruttore acceso, come blocchi privati "Focus".
- Ora è spento per entrambi gli account (giovi.turri9@gmail.com e engioturri@gmail.com): non viene scritto nulla.

## Modifica
- In Impostazioni, al posto degli interruttori per account, una sola scelta: "Copia le task in:" con l'elenco di tutti i calendari scrivibili di tutti gli account collegati, più "Nessuno".
- Scegliendo un calendario, si attiva solo quello; gli altri vengono spenti in automatico.
- Se in passato erano stati copiati blocchi su un altro calendario, vengono rimossi da lì quando cambi destinazione.
- Nome dei blocchi ("Focus") e visibilità restano modificabili.

## Dettagli tecnici
- Al salvataggio: imposta `mirror_enabled=true` + `mirror_target_calendar_id` sulla connessione scelta, `false` sulle altre (azione `update_mirror_settings` estesa o nuova azione `set_single_mirror_target` nella funzione google-calendar-auth).
- Quando una connessione viene disattivata o cambia calendario, elimina gli eventi in `task_calendar_mirrors` di quella connessione, poi esegue il backfill sulla nuova.
- Il selettore mostra solo calendari con accesso writer/owner.
