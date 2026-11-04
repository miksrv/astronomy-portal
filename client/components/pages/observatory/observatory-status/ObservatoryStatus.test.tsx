import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { ObservatoryStatus } from './ObservatoryStatus'

jest.mock('@/api', () => ({ ApiModel: {}, ApiType: {} }))

// The map loads d3-celestial: the test only needs to know it was asked for
jest.mock('@/components/common', () => ({
    StarMap: ({ telescope }: { telescope?: unknown }) => (
        <div data-testid={'star-map'}>{telescope ? 'marker' : 'no marker'}</div>
    )
}))

// Without an i18n instance `t` returns the default text as is: interpolate it like the real one
jest.mock('next-i18next/pages', () => ({
    useTranslation: () => ({
        i18n: { language: 'ru' },
        t: (_key: string, fallback: string, options?: Record<string, unknown>) =>
            fallback.replace(/{{(\w+)}}/g, (_match, name: string) => String(options?.[name] ?? ''))
    })
}))

// The kit mock renders neither the header nor the action of a Container: the badge and the
// title live there, so the test renders them as plain children
jest.mock('simple-react-ui-kit', () => {
    const actual = jest.requireActual('../../../../__mocks__/simple-react-ui-kit')

    return {
        ...actual,
        Container: ({
            header,
            action,
            children
        }: {
            header?: React.ReactNode
            action?: React.ReactNode
            children?: React.ReactNode
        }) => (
            <div>
                {header}
                {action}
                {children}
            </div>
        )
    }
})

const now = new Date('2026-11-03T22:02:00Z')

const driver = { name: 'EQMod Mount', version: '1.4' }

const snapshot = {
    time: '2026-11-03T22:00:00Z',
    indi: { online: true, profile: 'AstroLab' },
    devices: [
        { name: 'EQMod Mount', role: 'mount' as const, connected: true, driver },
        { name: 'ZWO CCD', role: 'camera' as const, connected: true, driver: null },
        { name: 'ZWO EFW', role: 'filter' as const, connected: true, driver: null },
        { name: 'Roll Roof', role: 'roof' as const, connected: true, driver: null },
        { name: 'WatchDog', role: 'watchdog' as const, connected: true, driver: null },
        { name: 'ZWO EAF', role: 'focuser' as const, connected: false, driver: null }
    ],
    mount: {
        ra: 10.9,
        dec: 41.4,
        raJ2000: 10.6847,
        decJ2000: 41.2692,
        alt: 62.4,
        az: 75.1,
        parked: false,
        tracking: true,
        slewing: false,
        trackMode: 'sidereal' as const,
        pierSide: 'west' as const,
        lst: 23.55,
        target: { ra: 10.6847, dec: 41.2692 }
    },
    camera: {
        temperature: -10.1,
        coolerOn: true,
        coolerPower: 34,
        exposing: true,
        exposureLeft: 182.5,
        frameType: 'light' as const,
        binning: 1,
        gain: 150,
        offset: 50,
        sensor: { width: 9576, height: 6388, pixelSize: 3.76 },
        focalLength: 1000,
        aperture: 200,
        fov: { width: 2.06, height: 1.38 }
    },
    filter: { slot: 2, name: 'R', names: ['L', 'R', 'G'], moving: false },
    focuser: null,
    roof: { state: 'open' as const, parked: false },
    watchdog: { armed: true, heartbeat: 600, triggers: ['client', 'weather'], shutdown: ['mount', 'dome'] },
    scheduler: { state: 'running' as const, job: 'M31' }
}

describe('ObservatoryStatus', () => {
    it('shows the summary bar and a card per device', () => {
        render(
            <ObservatoryStatus
                status={{ online: true, updatedAt: snapshot.time, snapshot }}
                now={now}
            />
        )

        expect(screen.getByText('На связи')).toBeInTheDocument()
        expect(screen.getByText('обновлено 2 мин назад')).toBeInTheDocument()
        expect(screen.getByText('AstroLab')).toBeInTheDocument()
        expect(screen.getByText('M31')).toBeInTheDocument()
        expect(screen.getByText('5 из 6 подключено')).toBeInTheDocument()

        // mount
        expect(screen.getByText('EQMod Mount')).toBeInTheDocument()
        expect(screen.getByText('EQMod Mount v1.4')).toBeInTheDocument()
        expect(screen.getByText('Ведение')).toBeInTheDocument()
        expect(screen.getByText('звёздная')).toBeInTheDocument()
        expect(screen.getByText('23:33:00')).toBeInTheDocument()
        expect(screen.getByTestId('star-map')).toHaveTextContent('marker')

        // camera, filters, roof, watchdog
        expect(screen.getByText('Съёмка · 3:03')).toBeInTheDocument()
        expect(screen.getByText('9576 × 6388 px')).toBeInTheDocument()
        expect(screen.getByText('Открыта')).toBeInTheDocument()
        expect(screen.getByText('Телескоп не в парковке')).toBeInTheDocument()
        expect(screen.getByText('1. парковка монтировки → 2. закрытие крыши')).toBeInTheDocument()
        expect(screen.getAllByRole('listitem').find((item) => item.getAttribute('aria-current'))).toHaveTextContent('R')
        expect(screen.queryByText('Нет связи с обсерваторией', { exact: false })).not.toBeInTheDocument()
    })

    it('shows a disconnected device as a card without data', () => {
        render(
            <ObservatoryStatus
                status={{ online: true, updatedAt: snapshot.time, snapshot }}
                now={now}
            />
        )

        expect(screen.getByText('ZWO EAF')).toBeInTheDocument()
        expect(screen.getByText('Не подключено')).toBeInTheDocument()
    })

    it('marks a disconnected device red and one with INDI alerts orange', () => {
        render(
            <ObservatoryStatus
                status={{
                    online: true,
                    updatedAt: snapshot.time,
                    snapshot: {
                        ...snapshot,
                        devices: (snapshot.devices ?? []).map((device) =>
                            device.role === 'camera' ? { ...device, alerts: ['Temperature'] } : device
                        )
                    }
                }}
                now={now}
            />
        )

        expect(screen.getByText('Предупреждение')).toBeInTheDocument()
        expect(screen.getByText('INDI сообщает об ошибке: Temperature')).toBeInTheDocument()
        expect(screen.getAllByText('Не подключено').length).toBeGreaterThan(0)
    })

    it('still shows where a parked mount looks, with a note', () => {
        render(
            <ObservatoryStatus
                status={{
                    online: true,
                    updatedAt: snapshot.time,
                    snapshot: { ...snapshot, mount: { ...snapshot.mount, parked: true, tracking: false } }
                }}
                now={now}
            />
        )

        expect(screen.getByText('Припаркована')).toBeInTheDocument()
        expect(screen.getByTestId('star-map')).toHaveTextContent('marker')
        expect(screen.getByTestId('star-map')).not.toHaveTextContent('no marker')
        expect(screen.getByText('Телескоп припаркован')).toBeInTheDocument()
    })

    it('puts the sky map and the event log in the same block', () => {
        render(
            <ObservatoryStatus
                status={{ online: true, updatedAt: snapshot.time, snapshot }}
                now={now}
                events={[{ id: 1, type: 'roof_closed', device: null, time: '2026-11-03T21:50:00Z' }]}
            />
        )

        expect(screen.getByTestId('star-map')).toBeInTheDocument()
        expect(screen.getByText('Недавние события')).toBeInTheDocument()
        expect(screen.getByText('Крыша закрыта')).toBeInTheDocument()
    })

    it('shows the map veiled when the mount is unknown', () => {
        render(
            <ObservatoryStatus
                status={{
                    online: true,
                    updatedAt: snapshot.time,
                    snapshot: { time: snapshot.time, indi: { online: true, profile: null }, mount: null }
                }}
                now={now}
            />
        )

        expect(screen.getByText('Положение телескопа неизвестно')).toBeInTheDocument()
    })

    it('leaves the weather to the weather card', () => {
        render(
            <ObservatoryStatus
                status={{ online: true, updatedAt: snapshot.time, snapshot }}
                now={now}
            />
        )

        expect(screen.queryByText('Безопасность погоды')).not.toBeInTheDocument()
        expect(screen.queryByText('Облачность')).not.toBeInTheDocument()
    })

    it('shows a switched-off observatory calmly, the last data only on demand', () => {
        render(
            <ObservatoryStatus
                status={{ online: false, updatedAt: snapshot.time, snapshot }}
                now={now}
            />
        )

        // A grey "switched off", a calm plate, no stale device cards with their errors
        expect(screen.getByText('Выключена')).toBeInTheDocument()
        expect(screen.getAllByText('Обсерватория выключена').length).toBeGreaterThan(0)
        expect(screen.getByText('Последняя связь:', { exact: false })).toBeInTheDocument()
        expect(screen.queryByText('Не подключено')).not.toBeInTheDocument()
        expect(screen.queryByText('EQMod Mount')).not.toBeInTheDocument()

        fireEvent.click(screen.getByText('Показать последние полученные данные'))

        expect(screen.getByText('EQMod Mount')).toBeInTheDocument()
        expect(screen.getByText('Последние полученные данные', { exact: false })).toBeInTheDocument()

        fireEvent.click(screen.getByText('Скрыть'))

        expect(screen.queryByText('EQMod Mount')).not.toBeInTheDocument()
    })

    it('copes with a snapshot that has only INDI in it', () => {
        render(
            <ObservatoryStatus
                status={{
                    online: true,
                    updatedAt: snapshot.time,
                    snapshot: { time: snapshot.time, indi: { online: false, profile: null } }
                }}
                now={now}
            />
        )

        expect(screen.getAllByText('Оборудование выключено').length).toBeGreaterThan(0)
        expect(screen.getByText('На связи')).toBeInTheDocument()
        expect(screen.queryByText('Показать последние полученные данные')).not.toBeInTheDocument()
    })

    it('says so when the observatory never reported', () => {
        render(<ObservatoryStatus status={{ online: false, updatedAt: null, snapshot: null }} />)

        expect(screen.getByText('Обсерватория ещё не выходила на связь')).toBeInTheDocument()
        expect(screen.getByText('Нет данных о телескопе')).toBeInTheDocument()
    })
})
