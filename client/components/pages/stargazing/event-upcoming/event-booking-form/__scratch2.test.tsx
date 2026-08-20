import 'whatwg-fetch'
import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'
import applicationSlice from '@/api/applicationSlice'
import authSlice from '@/api/authSlice'
import { EventBookingForm } from '@/components/pages/stargazing/event-upcoming/event-booking-form'

// Real store + real API slice, only the network layer is stubbed - to observe
// the true timing of isSuccess vs paymentRedirect across the actual RTK Query
// dispatch cycle (a fully-mocked mutation hook can't reveal this race).
const store = configureStore({
    reducer: {
        application: applicationSlice,
        auth: authSlice,
        [API.reducerPath]: API.reducer
    },
    middleware: (getDefault) => getDefault().concat(API.middleware),
    preloadedState: {
        auth: { user: { name: 'Test User', phone: '+79991234567' } } as any
    }
})

const responseBody = { result: true, payment: { formUrl: 'https://bank/pay', orderId: 'o1', amount: 500 } }

global.fetch = jest.fn().mockImplementation(
    () =>
        new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        })
) as any

// jsdom throws on assigning a real external URL to window.location.href - stub it.
delete (window as any).location
;(window as any).location = { href: '' }

it('traces isSuccess vs paymentRedirect/onSuccessSubmit ordering for a paid booking', async () => {
    const onSuccess = jest.fn()
    const onPaymentRedirect = jest.fn()

    render(
        <Provider store={store}>
            <EventBookingForm
                eventId='event-1'
                ticketPrice={500}
                onSuccessSubmit={onSuccess}
                onPaymentRedirect={onPaymentRedirect}
            />
        </Provider>
    )

    fireEvent.click(screen.getByText('Перейти к оплате'))

    await waitFor(() => {
        expect(onPaymentRedirect).toHaveBeenCalledWith('https://bank/pay')
    })

    // Give any pending effects/microtasks a chance to flush before asserting.
    await new Promise((r) => setTimeout(r, 50))

    // eslint-disable-next-line no-console
    console.log('onSuccess called:', onSuccess.mock.calls)

    expect(onSuccess).not.toHaveBeenCalled()
})
