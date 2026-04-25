## Why notifications don't work today

Investigated `src/hooks/useReminders.ts`, `SettingsPage.tsx`, `index.html`, `main.tsx`, and `public/`. Found 4 root causes — together they explain why nothing fires on Android Chrome or iOS Chrome/Safari:

1. **No service worker.** On Android Chrome, `new Notification(...)` from a regular page is unreliable when the tab is backgrounded or the screen is off — many Android builds ignore it entirely and only `ServiceWorkerRegistration.showNotification()` actually displays a system tray notification. We never register a SW.
2. **No PWA manifest, so iOS shows nothing at all.** On iOS (both Safari and Chrome — Chrome iOS uses WebKit), the Web Notifications API is **only exposed when the site is installed to the Home Screen as a PWA** (iOS 16.4+). Without a `manifest.webmanifest`, `Notification` is `undefined` and our code silently falls back to in-app toasts.
3. **The user is never asked for permission outside Settings.** Many users toggle "Send reminders" without ever visiting the enable button. If the OS permission stays `default`, every reminder silently downgrades to a toast that only appears while the page is open.
4. **No way to verify it works.** There's no "Test notification" button, so users can't tell whether the failure is permission, scheduling, or platform support.

Also worth knowing: notifications are blocked inside the Lovable editor preview iframe by browser permission policies. They will only really work on the published URL `https://giotask.lovable.app` (or a custom domain).

## What I will change

### 1. Add a service worker for real system notifications
- New file `public/sw.js` — minimal SW that handles `notificationclick` (focus/open the app) and a `SHOW_NOTIFICATION` message from the page so the page can ask the SW to display notifications.
- Register it from `src/main.tsx` (only outside the Lovable preview iframe to avoid cache pollution, per Lovable PWA guidance).
- Update `useReminders.ts` so `fireNotification()` prefers `swRegistration.showNotification(...)` and only falls back to `new Notification(...)` then to a toast.

### 2. Add a minimal PWA manifest so iOS exposes the Notifications API
- New file `public/manifest.webmanifest` with `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, theme/background colors, and icons (reusing the existing favicon plus `placeholder.svg`).
- Add `<link rel="manifest" href="/manifest.webmanifest">`, `<meta name="theme-color">`, and the iOS-specific `apple-mobile-web-app-capable` / `apple-touch-icon` tags to `index.html`.
- This is a non-PWA "installable web app" (no offline/Workbox caching), so it won't break the Lovable preview.

### 3. Prompt for permission at the right time + auto-prompt when the toggle is enabled
- In `SettingsPage.tsx`, when the user flips "Send reminders" ON and the OS permission is still `default`, automatically call `requestNotificationPermission()` before saving the setting.
- Show a clearer status block: explicit "Not supported on this device — install to Home Screen first" message on iOS when `Notification` is undefined, with short Italian/English instructions.
- Add a "Send test notification" button so the user can immediately confirm it works end-to-end.

### 4. Small UX/robustness fixes in `useReminders.ts`
- When the OS permission is `default` but `notifications_enabled` is on, request permission once on mount (after a tap-driven event the next time the user interacts with the page — required by browsers).
- Make `fireNotification()` async and route through the SW registration when available.
- Re-evaluate timers every 15 minutes (currently the hourly interval is a no-op) and on `visibilitychange`/window focus, so reminders stay accurate after the device wakes.

## Important caveats (will be shown in Settings)

- **iOS**: Push/local notifications only work after the user taps Share → Add to Home Screen and opens the app from that icon. Inside Safari or Chrome iOS tab, they will never appear — this is a WebKit limitation, not a bug.
- **Android Chrome**: Works in a normal tab once permission is granted, but the browser process must still be running in the background. For true "app-closed" delivery we'd need server-side Web Push (VAPID + push subscription) or a native build. This plan does **not** add server push — only locally-scheduled notifications via the service worker, which is what your current architecture supports.
- **Lovable preview iframe**: Notifications and SW registration are intentionally suppressed there. Testing must be done on `https://giotask.lovable.app`.

## Files touched

- new: `public/sw.js`
- new: `public/manifest.webmanifest`
- edit: `index.html` — manifest link + iOS PWA meta tags
- edit: `src/main.tsx` — register service worker (skipped in iframe/preview)
- edit: `src/hooks/useReminders.ts` — use SW for notifications; auto-request permission; refresh on visibility change
- edit: `src/pages/SettingsPage.tsx` — auto-prompt on toggle on; "Send test notification" button; clearer iOS/Android guidance
