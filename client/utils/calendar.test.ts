import { buildEventIcs } from './calendar'

describe('calendar', () => {
    describe('buildEventIcs', () => {
        it('builds a VEVENT with start/end/summary', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Астровыезд у Экодеревни',
                start: '2026-07-12 15:00:00',
                end: '2026-07-12 18:00:00'
            })

            expect(ics).toContain('BEGIN:VCALENDAR')
            expect(ics).toContain('BEGIN:VEVENT')
            expect(ics).toContain('UID:abc123@astro.miksoft.pro')
            expect(ics).toContain('DTSTART:20260712T150000Z')
            expect(ics).toContain('DTEND:20260712T180000Z')
            expect(ics).toContain('SUMMARY:Астровыезд у Экодеревни')
            expect(ics).toContain('END:VEVENT')
            expect(ics).toContain('END:VCALENDAR')
        })

        it('falls back to a 3-hour duration when end is missing', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Астровыезд',
                start: '2026-07-12 15:00:00'
            })

            expect(ics).toContain('DTSTART:20260712T150000Z')
            expect(ics).toContain('DTEND:20260712T180000Z')
        })

        it('joins location and address, and escapes reserved characters', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test; Event, Name',
                start: '2026-07-12 15:00:00',
                location: 'Экодеревня',
                address: 'с. Гуторово, 1'
            })

            expect(ics).toContain('LOCATION:Экодеревня\\, с. Гуторово\\, 1')
            expect(ics).toContain('SUMMARY:Test\\; Event\\, Name')
        })

        it('omits the LOCATION line when neither location nor address is provided', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00'
            })

            expect(ics).not.toContain('LOCATION:')
        })

        it('adds a GEO line when coordinates are provided', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00',
                latitude: 51.8250225,
                longitude: 55.71072
            })

            expect(ics).toContain('GEO:51.8250225;55.71072')
        })

        it('sets URL to the event page link when provided', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00',
                pageUrl: 'https://astro.miksoft.pro/stargazing/abc123'
            })

            expect(ics).toContain('URL:https://astro.miksoft.pro/stargazing/abc123')
        })

        it('omits URL when no page link is provided', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00'
            })

            expect(ics).not.toMatch(/^URL:/m)
        })

        it('adds a labeled Yandex Maps link to DESCRIPTION when coordinates are provided', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00',
                latitude: 51.8250225,
                longitude: 55.71072
            })

            expect(ics).toContain(
                'DESCRIPTION:Яндекс Карты: https://yandex.ru/maps/?pt=55.71072\\,51.8250225&z=16&l=map'
            )
        })

        it('omits the VEVENT-level DESCRIPTION when no coordinates are provided', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00'
            })

            // The VALARM still carries its own required DESCRIPTION — only the
            // event-level one (the map link) should be absent.
            expect(ics).not.toMatch(/DESCRIPTION:Яндекс/)
        })

        it('defaults the reminder to 3 hours before the start', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00'
            })

            expect(ics).toContain('BEGIN:VALARM')
            expect(ics).toContain('TRIGGER:-PT3H')
            expect(ics).toContain('END:VALARM')
        })

        it('allows overriding the reminder lead time', () => {
            const ics = buildEventIcs({
                uid: 'abc123',
                title: 'Test',
                start: '2026-07-12 15:00:00',
                reminderHoursBefore: 1
            })

            expect(ics).toContain('TRIGGER:-PT1H')
        })
    })
})
