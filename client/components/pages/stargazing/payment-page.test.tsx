import React from 'react'

import { useRouter } from 'next/router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'
// NOTE: the page lives under pages/ (a Next route), so its test is kept here
// under components/ — Next must not treat test files as routes.
import StargazingPaymentPage from '@/pages/stargazing/payment'

jest.mock('@/api', () => ({
    API: {
        useEventPaymentStatusMutation: jest.fn(),
        useEventsRegistrationPostMutation: jest.fn(),
        util: { getRunningQueriesThunk: jest.fn() }
    },
    setLocale: jest.fn(),
    SITE_LINK: 'https://example.test/',
    wrapper: { getServerSideProps: () => () => ({}) }
}))

// The Jest CJS build of the kit does not expose Spinner; provide light stand-ins.
jest.mock('simple-react-ui-kit', () => {
    return {
        Button: ({
            children,
            label,
            onClick
        }: {
            children?: React.ReactNode
            label?: string
            onClick?: () => void
        }) => <button onClick={onClick}>{label ?? children}</button>,
        Container: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
        Message: ({ title, children }: { title?: string; children?: React.ReactNode }) => (
            <div>
                {title}
                {children}
            </div>
        ),
        Spinner: () => null
    }
})

jest.mock('@/api/authSlice', () => ({ setSSRToken: jest.fn() }))
jest.mock('cookies-next', () => ({ getCookie: jest.fn() }))
jest.mock('next-i18next/pages', () => ({
    useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: 'ru' } })
}))
jest.mock('next-i18next/pages/serverSideTranslations', () => ({ serverSideTranslations: jest.fn() }))
jest.mock('next-seo/pages', () => ({ generateNextSeo: () => null }))
jest.mock('next/router', () => ({ useRouter: jest.fn() }))

const mockTrigger = jest.fn()
const mockRetryBooking = jest.fn()
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockEventsOn = jest.fn()
const mockEventsOff = jest.fn()
const mockEventsEmit = jest.fn()

const resolveStatus = (status: string) => ({ unwrap: () => Promise.resolve({ status }) })
const rejectWith = (error: unknown) => ({ unwrap: () => Promise.reject(error) })

beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    ;(API.useEventPaymentStatusMutation as jest.Mock).mockReturnValue([mockTrigger, {}])
    ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([mockRetryBooking, { isLoading: false }])
    ;(useRouter as jest.Mock).mockReturnValue({
        isReady: true,
        push: mockPush,
        replace: mockReplace,
        query: { orderId: 'order-1' },
        events: { on: mockEventsOn, off: mockEventsOff, emit: mockEventsEmit }
    })
})

describe('StargazingPaymentPage', () => {
    it('redirects to the profile ticket section when the payment is paid', async () => {
        mockTrigger.mockReturnValue(resolveStatus('paid'))

        render(<StargazingPaymentPage />)

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile#upcoming-event'))
        expect(mockTrigger).toHaveBeenCalledWith({ orderId: 'order-1' })
    })

    it('quietly redirects to the profile page when the payment belongs to another user', async () => {
        mockTrigger.mockReturnValue(rejectWith({ status: 403, messages: { error: 'Forbidden' } }))

        render(<StargazingPaymentPage />)

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/profile'))
        expect(screen.queryByText('Оплата не прошла')).toBeNull()
    })

    it('shows the failure message when the payment failed', async () => {
        mockTrigger.mockReturnValue(resolveStatus('failed'))

        render(<StargazingPaymentPage />)

        expect(await screen.findByText('Оплата не прошла')).toBeDefined()
    })

    it('shows the checking state while the payment is still pending', async () => {
        mockTrigger.mockReturnValue(resolveStatus('pending'))

        render(<StargazingPaymentPage />)

        expect(await screen.findByText('Проверяем статус оплаты, пожалуйста, подождите…')).toBeDefined()
    })

    it('shows an error and does not poll when orderId is missing', async () => {
        ;(useRouter as jest.Mock).mockReturnValue({
            isReady: true,
            push: mockPush,
            replace: mockReplace,
            query: {},
            events: { on: mockEventsOn, off: mockEventsOff, emit: mockEventsEmit }
        })

        render(<StargazingPaymentPage />)

        expect(await screen.findByText('Оплата не прошла')).toBeDefined()
        expect(mockTrigger).not.toHaveBeenCalled()
    })

    it('does not show the retry button when no attempt was saved', async () => {
        mockTrigger.mockReturnValue(resolveStatus('failed'))

        render(<StargazingPaymentPage />)

        await screen.findByText('Оплата не прошла')

        expect(screen.queryByText('Попробовать снова')).toBeNull()
    })

    it('retries with the saved attempt data and redirects to the new payment form', async () => {
        mockTrigger.mockReturnValue(resolveStatus('failed'))

        const savedAttempt = { adults: 2, children: 0, eventId: 'event-1', name: 'Ivan' }
        sessionStorage.setItem('astro:lastBookingAttempt', JSON.stringify(savedAttempt))

        mockRetryBooking.mockResolvedValue({
            data: { payment: { formUrl: 'https://pay/new', orderId: 'order-2' }, result: true }
        })

        render(<StargazingPaymentPage />)

        const retryButton = await screen.findByText('Попробовать снова')

        fireEvent.click(retryButton)

        await waitFor(() => expect(mockRetryBooking).toHaveBeenCalledWith(savedAttempt))
    })

    it('registers a routeChangeStart guard that blocks leaving while a request is in flight', async () => {
        let resolveTrigger: (value: { status: string }) => void = () => {}
        mockTrigger.mockReturnValue({
            unwrap: () =>
                new Promise((resolve) => {
                    resolveTrigger = resolve
                })
        })

        render(<StargazingPaymentPage />)

        expect(mockEventsOn).toHaveBeenCalledWith('routeChangeStart', expect.any(Function))
        const guard = mockEventsOn.mock.calls.find(([event]) => event === 'routeChangeStart')?.[1]

        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

        expect(() => guard()).toThrow()
        expect(confirmSpy).toHaveBeenCalled()
        expect(mockEventsEmit).toHaveBeenCalledWith('routeChangeError')

        confirmSpy.mockRestore()
        resolveTrigger({ status: 'paid' })
    })
})
