import React from 'react'
import { Provider } from 'react-redux'

import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'
import applicationSlice from '@/api/applicationSlice'
import authSlice from '@/api/authSlice'

import { EventBookingForm } from './EventBookingForm'

import 'whatwg-fetch'

// Unlike EventBookingForm.test.tsx (which mocks the mutation hook), this file runs
// the real store and the real RTK Query slice and stubs only the network layer.
// A fully mocked hook cannot reproduce the ordering of `isSuccess` versus the
// payment redirect across the real dispatch cycle, which is exactly the race this
// guards: a paid booking must hand over to the bank and never report itself as
// registered (onSuccessSubmit) before the user returns from the payment.
const rootReducer = combineReducers({
    application: applicationSlice,
    auth: authSlice,
    [API.reducerPath]: API.reducer
})

const createStore = () =>
    configureStore({
        reducer: rootReducer,
        middleware: (getDefault) => getDefault().concat(API.middleware),
        preloadedState: {
            auth: { user: { name: 'Test User', phone: '+79991234567' } }
        } as Partial<ReturnType<typeof rootReducer>>
    })

const PAYMENT_URL = 'https://bank/pay'

const originalFetch = global.fetch
const originalLocation = window.location

beforeEach(() => {
    global.fetch = jest
        .fn()
        .mockImplementation(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({ result: true, payment: { formUrl: PAYMENT_URL, orderId: 'o1', amount: 500 } }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            )
        )

    // jsdom throws when a real external URL is assigned to window.location.href
    const mutableWindow = window as unknown as { location?: Pick<Location, 'href'> }
    delete mutableWindow.location
    mutableWindow.location = { href: '' }
})

afterEach(() => {
    global.fetch = originalFetch
    ;(window as unknown as { location: Location }).location = originalLocation
})

describe('EventBookingForm paid booking (real RTK Query dispatch)', () => {
    it('redirects to the bank and never calls onSuccessSubmit', async () => {
        const onSuccessSubmit = jest.fn()
        const onPaymentRedirect = jest.fn()

        render(
            <Provider store={createStore()}>
                <EventBookingForm
                    eventId={'event-1'}
                    ticketPrice={500}
                    onSuccessSubmit={onSuccessSubmit}
                    onPaymentRedirect={onPaymentRedirect}
                />
            </Provider>
        )

        fireEvent.click(screen.getByText('Перейти к оплате'))

        await waitFor(() => {
            expect(onPaymentRedirect).toHaveBeenCalledWith(PAYMENT_URL)
        })

        // Let pending effects and microtasks flush before asserting the negative.
        await new Promise((resolve) => setTimeout(resolve, 50))

        expect(onSuccessSubmit).not.toHaveBeenCalled()
    })
})
