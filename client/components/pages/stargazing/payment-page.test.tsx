import React from 'react'

import { useRouter } from 'next/router'
import { render, screen } from '@testing-library/react'

import { API } from '@/api'
// NOTE: the page lives under pages/ (a Next route), so its test is kept here
// under components/ — Next must not treat test files as routes.
import StargazingPaymentPage from '@/pages/stargazing/payment'

jest.mock('@/api', () => ({
    API: {
        useEventPaymentStatusMutation: jest.fn(),
        util: { getRunningQueriesThunk: jest.fn() }
    },
    setLocale: jest.fn(),
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
jest.mock('next-i18next/pages', () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }) }))
jest.mock('next-i18next/pages/serverSideTranslations', () => ({ serverSideTranslations: jest.fn() }))
jest.mock('next/router', () => ({ useRouter: jest.fn() }))

jest.mock('@/components/common', () => ({
    AppFooter: () => <div />,
    AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AppToolbar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
}))

const mockTrigger = jest.fn()
const mockPush = jest.fn()

const resolveStatus = (status: string) => ({ unwrap: () => Promise.resolve({ status }) })

beforeEach(() => {
    jest.clearAllMocks()
    ;(API.useEventPaymentStatusMutation as jest.Mock).mockReturnValue([mockTrigger, {}])
    ;(useRouter as jest.Mock).mockReturnValue({
        isReady: true,
        push: mockPush,
        query: { orderId: 'order-1' }
    })
})

describe('StargazingPaymentPage', () => {
    it('shows the success message when the payment is paid', async () => {
        mockTrigger.mockReturnValue(resolveStatus('paid'))

        render(<StargazingPaymentPage />)

        expect(await screen.findByText('Оплата прошла успешно')).toBeDefined()
        expect(mockTrigger).toHaveBeenCalledWith({ orderId: 'order-1' })
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
            query: {}
        })

        render(<StargazingPaymentPage />)

        expect(await screen.findByText('Оплата не прошла')).toBeDefined()
        expect(mockTrigger).not.toHaveBeenCalled()
    })
})
