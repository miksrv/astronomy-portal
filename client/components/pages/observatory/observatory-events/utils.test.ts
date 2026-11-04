import { getEventDevice, getEventMeta, groupEventsByDay } from './utils'

const event = (id: number, time: string, type = 'roof_closed', device: string | null = 'Roll Roof') => ({
    id,
    type,
    device,
    time
})

describe('observatory events utils', () => {
    it('groups events by the Orenburg day, naming today and yesterday', () => {
        // 2026-11-03 23:30 UTC is already the 4th in Orenburg (UTC+5)
        const now = new Date('2026-11-04T01:00:00Z')

        const days = groupEventsByDay(
            [
                event(4, '2026-11-03T23:30:00Z'),
                event(3, '2026-11-03T10:00:00Z'),
                event(2, '2026-11-02T20:00:00Z'),
                event(1, '2026-11-01T08:00:00Z')
            ],
            now
        )

        expect(days.map(({ key, kind, events }) => [key, kind, events.length])).toStrictEqual([
            ['2026-11-04', 'today', 1],
            ['2026-11-03', 'yesterday', 2],
            ['2026-11-01', 'date', 1]
        ])
    })

    it('names every day by its date before the time is known', () => {
        const days = groupEventsByDay([event(1, '2026-11-03T10:00:00Z')])

        expect(days[0]?.kind).toBe('date')
    })

    it('gives every type an icon and a tone, unknown types included', () => {
        expect(getEventMeta('weather_alert').tone).toBe('alert')
        expect(getEventMeta('weather_ok').tone).toBe('ok')
        expect(getEventMeta('something_new').tone).toBe('neutral')
    })

    it('shows the device only when the text does not already say it', () => {
        expect(getEventDevice(event(1, 't', 'roof_closed', 'Roll Roof'))).toBeUndefined()
        expect(getEventDevice(event(1, 't', 'job_started', 'Ekos'))).toBe('Ekos')
        expect(getEventDevice(event(1, 't', 'something_new', 'Foo'))).toBe('Foo')
        expect(getEventDevice(event(1, 't', 'job_started', null))).toBeUndefined()
    })
})
