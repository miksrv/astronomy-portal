import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API, useAppDispatch, useAppSelector } from '@/api'

import { RelayList } from './RelayList'

jest.mock('@/api', () => ({
    API: {
        useRelayGetStateQuery: jest.fn(),
        useRelayPutStatusMutation: jest.fn(),
        useRelayToggleLightMutation: jest.fn(),
        util: { updateQueryData: jest.fn() },
        endpoints: {
            relayGetState: {
                initiate: jest.fn()
            }
        }
    },
    ApiModel: {
        Permission: {
            RELAY_CONTROL: 'relay.control'
        }
    },
    ApiType: {},
    useAppDispatch: jest.fn(),
    useAppSelector: jest.fn()
}))

const baseRelayList = {
    items: [
        { id: 0, name: 'Розетка', state: 0 },
        { id: 1, name: 'Освещение', state: 0 }
    ],
    light: { cooldown: 0, counter: 3, enable: true }
}

// Resolves only once `resolveToggle()` is called, so the test can assert on
// the optimistic "on" state while the mutation is still in flight.
let resolveToggle: () => void
const mockSetLightOn = jest.fn()

// jsdom's IntersectionObserver never reports an intersection: the card is treated as in view
jest.mock('@/hooks/useInView', () => ({ useInView: () => true }))

beforeEach(() => {
    jest.clearAllMocks()

    ;(useAppSelector as jest.Mock).mockImplementation((selector) => selector({ auth: { user: undefined } }))
    ;(useAppDispatch as jest.Mock).mockReturnValue(jest.fn((action) => action))

    ;(API.useRelayGetStateQuery as jest.Mock).mockReturnValue({
        data: baseRelayList,
        isLoading: false,
        isError: false
    })
    ;(API.useRelayPutStatusMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }])

    mockSetLightOn.mockImplementation(
        () =>
            new Promise((resolve) => {
                resolveToggle = () => resolve({})
            })
    )
    ;(API.useRelayToggleLightMutation as jest.Mock).mockReturnValue([mockSetLightOn, { isLoading: false }])
    ;(API.endpoints.relayGetState.initiate as jest.Mock).mockReturnValue({
        unwrap: () => Promise.resolve(baseRelayList)
    })
})

describe('RelayList', () => {
    it('shows the light as on immediately, before the mutation resolves', async () => {
        render(<RelayList />)

        // The relay switches are disabled (the mock user has no `relay.control`
        // permission); the light button is the one anyone can press
        fireEvent.click(screen.getByText('Включить'))

        await waitFor(() => {
            expect(screen.getByText('Горит')).toBeDefined()
        })

        // The mutation hasn't resolved yet - only the optimistic value moved.
        expect(mockSetLightOn).toHaveBeenCalledTimes(1)

        resolveToggle()
    })
})

describe('RelayList switches', () => {
    it('renders a disabled switch per relay for a user without relay.control', () => {
        render(<RelayList />)

        const switches = screen.getAllByRole('switch')

        expect(switches.length).toBeGreaterThan(0)
        expect(switches.every((element) => (element as HTMLButtonElement).disabled)).toBe(true)
        expect(screen.getByText('Управление питанием доступно только администраторам')).toBeDefined()
    })
})
