self.addEventListener('push', (event) => {
    let data = {}

    try {
        data = event.data ? event.data.json() : {}
    } catch {
        // Our own server always sends JSON (WebPushLibrary::send() does
        // json_encode()), but a payload can arrive as plain text from
        // elsewhere - e.g. Chrome DevTools' own "Push" test button sends a
        // hardcoded placeholder string, not JSON. Fall back to it as the
        // body instead of letting the whole handler throw before
        // showNotification() ever runs - a push event that never shows a
        // notification is exactly what browsers penalize a subscription for.
        data = { body: event.data ? event.data.text() : '' }
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Смотри на звёзды', {
            body: data.body || '',
            icon: data.icon || '/favicon.ico',
            data: { url: data.url }
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    event.waitUntil(clients.openWindow(event.notification.data?.url || '/'))
})
