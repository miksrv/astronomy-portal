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
    it('flips the light button to "on" immediately, before the mutation resolves', async () => {
        render(<RelayList />)

        // Two "off" buttons render for the light relay: the generic per-relay
        // item (disabled - the mock user has no `relay.control` permission)
        // and the dedicated light-toggle control below it, which this targets.
        const lightToggle = screen
            .getAllByText('off')
            .find((button) => !(button as HTMLButtonElement).disabled) as HTMLButtonElement

        fireEvent.click(lightToggle)

        await waitFor(() => {
            expect(screen.getByText('on')).toBeDefined()
        })

        // The mutation hasn't resolved yet - only the optimistic value moved.
        expect(mockSetLightOn).toHaveBeenCalledTimes(1)

        resolveToggle()
    })
})
