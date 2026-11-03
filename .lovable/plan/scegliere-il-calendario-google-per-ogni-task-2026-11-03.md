# Scegliere il calendario Google per ogni task

## Come funziona oggi

- Per ogni account Google collegato c'è un interruttore "Copia task" con un calendario di destinazione.
- Se acceso, TUTTE le task programmate vengono copiate su ogni account attivo (quindi doppioni se ne accendi due).
- Ora è spento su entrambi gli account ([giovi.turri9@gmail.com](mailto:giovi.turri9@gmail.com), [engioturri@gmail.com](mailto:engioturri@gmail.com)): nessuna task finisce su Google.
- La lettura degli impegni da tutti i calendari collegati resta invariata: qui continui a vedere tutto aggregato.

## Cosa cambia

- **Calendario predefinito** (Impostazioni): scegli un solo calendario Google, tra tutti quelli scrivibili di tutti gli account, dove finiscono le task. Di default è quello di  [engioturri@gmail.com](mailto:engioturri@gmail.com)).
- **Nella finestra della task**: nuovo campo "Visibile in Google Calendar" con le opzioni: Predefinito, un calendario specifico, oppure "Non copiare". Ogni task finisce in un solo calendario, mai in più.
- Se cambi calendario a una task, il blocco viene spostato: cancellato dal vecchio e creato nel nuovo.
- Al primo salvataggio del predefinito, le task già programmate vengono copiate lì (una volta sola).
- Il titolo su Google resta nascosto ("Focus") e privato, come oggi; nome e visibilità restano modificabili.
- Le copie scritte dall'app non appaiono doppie nel calendario qui.

## Dettagli tecnici

- Migrazione: `tasks.google_calendar_target` (text, null = predefinito; `none` = non copiare; altrimenti `connectionId|calendarId`). In `user_settings` aggiungere `default_mirror_connection_id` e `default_mirror_calendar_id`.
- google-calendar-mirror: risolve la destinazione per singola task invece di ciclare su tutte le connessioni `mirror_enabled`; se la destinazione è diversa da quella salvata in `task_calendar_mirrors`, elimina il vecchio evento e crea il nuovo.
- google-calendar-auth: nuova azione per elencare i calendari scrivibili (writer/owner) di tutte le connessioni.
- UI: selettore in GoogleCalendarSettings (sostituisce gli interruttori per account) e in TaskDialog; dopo il salvataggio della task si richiama già `triggerTaskMirror`.
- Test: funzione di risoluzione destinazione (predefinito / specifico / none).