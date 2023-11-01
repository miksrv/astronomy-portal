import { api, useRelayGetStateQuery } from '@/api/api'
import { RootState, reducers } from '@/api/store'
import { configureStore } from '@reduxjs/toolkit'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'

import RelayList from './RelayList'

const testStore = (state: Partial<RootState>) => {
    return configureStore({
        middleware: (gDM) => gDM().concat(api.middleware),
        preloadedState: state,
        reducer: reducers
    })
}

const renderWithStore = (component: any, initialState: any) => {
    // @ts-ignore
    const Wrapper = ({ children }) => (
        <Provider store={testStore(initialState)}>{children}</Provider>
    )
    return render(component, { wrapper: Wrapper })
}

const customInitialState = {
    auth: {
        isAuth: true
    }
}

describe('RelayList', () => {
    it('should render a loading indicator when loading', () => {
        renderWithStore(<RelayList />, customInitialState)

        const loadingIndicator = screen.getByTestId('relay-list-loader')

        expect(loadingIndicator).toBeInTheDocument()
    })

    it.skip('should render an error message when there is an error', () => {
        // Define the mock function at the top of your test file
        const mockUseRelayGetStateQuery = jest.fn()

        jest.mock('@/api/api', () => ({
            ...jest.requireActual('@/api/api'),
            useRelayGetStateQuery: mockUseRelayGetStateQuery
        }))

        // Mock the behavior of useRelayGetLightMutation
        mockUseRelayGetStateQuery.mockReturnValue({
            isError: true, // Adjust to mimic error state
            isLoading: false // Adjust to mimic loading state
        })

        renderWithStore(<RelayList />, customInitialState)

        expect(mockUseRelayGetStateQuery).toHaveBeenCalled()

        const errorMessage = screen.getByText(
            'Error: Failed to fetch relay data'
        )

        expect(errorMessage).toBeInTheDocument()
    })

    it.skip('should render a list of relay items when data is available', () => {
        // Mock the relayList data
        const relayList = {
            items: [
                { id: 1, name: 'Relay 1', state: 0 },
                { id: 2, name: 'Relay 2', state: 1 }
            ],
            light: { counter: 5, enable: true }
        }

        renderWithStore(<RelayList />, customInitialState)
        const relayItems = screen.getAllByTestId('relay-item')

        // Ensure that the correct number of relay items are rendered
        expect(relayItems).toHaveLength(relayList.items.length)

        // Check if the relay item details are rendered correctly
        expect(screen.getByText('Relay 1')).toBeInTheDocument()
        expect(screen.getByText('Relay 2')).toBeInTheDocument()

        // You can add more assertions to check the state, loading status, and other details of the relay items
    })

    it.skip('should toggle relay state when the button is clicked', async () => {
        // Mock the relayList data and setRelayStatus function
        const relayList = {
            items: [{ id: 1, name: 'Relay 1', state: 0 }],
            light: { counter: 0, enable: true }
        }

        const setRelayStatus = jest.fn()

        render(<RelayList />)
        const relayItem = screen.getByTestId('relay-item-1')

        // Simulate a button click to toggle the relay state
        fireEvent.click(screen.getByText('Toggle'))

        // Check if the setRelayStatus function is called with the correct arguments
        expect(setRelayStatus).toHaveBeenCalledWith({ id: 1, state: 1 })
    })
})
