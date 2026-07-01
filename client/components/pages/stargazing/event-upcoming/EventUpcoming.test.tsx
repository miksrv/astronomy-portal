import React from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API, ApiModel, useAppSelector } from '@/api'
import { getSecondsUntilUTCDate } from '@/utils/dates'

import { EventUpcoming } from './EventUpcoming'

dayjs.extend(utc)

jest.mock('@/api', () => ({
    API: {
        useEventsCancelRegistrationPostMutation: jest.fn(),
        useEventsRegistrationPostMutation: jest.fn(),
        util: { invalidateTags: jest.fn() }
    },
    useAppSelector: jest.fn(),
    useAppDispatch: () => jest.fn()
}))

jest.mock('next-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, defaultValue: string) => defaultValue })
}))

jest.mock('@/utils/dates', () => ({
    formatUTCDate: () => '1 January, 2025',
    getHumanTimeFromSec: () => '8 минут 20 секунд',
    getLocalizedTimeFromSec: () => '1 день',
    getSecondsUntilUTCDate: jest.fn(() => undefined)
}))

jest.mock('@/components/common', () => ({
    LoginForm: () => <div>LoginForm</div>
}))

jest.mock('./event-booking-form', () => ({
    EventBookingForm: () => <div>EventBookingForm</div>
}))

const mockCancelMutate = jest.fn()
const defaultCancelState = { isLoading: false }
const mockRetryMutate = jest.fn()
const defaultRetryState = { isLoading: false }

const baseEvent: ApiModel.Event = {
    id: 'event-1',
    title: 'Test Stargazing Event',
    coverFileName: 'cover',
    coverFileExt: 'jpg',
    registered: true,
    // The real API always sets this alongside registered: true.
    bookingStatus: 'confirmed',
    availableTickets: 5,
    date: { date: new Date(Date.now() + 86400000 * 10).toISOString() },
    registrationStart: { date: new Date(Date.now() - 86400000 * 5).toISOString() },
    registrationEnd: { date: new Date(Date.now() + 86400000 * 5).toISOString() }
}

beforeEach(() => {
    jest.clearAllMocks()
    ;(API.useEventsCancelRegistrationPostMutation as jest.Mock).mockReturnValue([mockCancelMutate, defaultCancelState])
    ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([mockRetryMutate, defaultRetryState])
    ;(useAppSelector as jest.Mock).mockReturnValue({ id: 'user-1', name: 'Test User' })
    ;(getSecondsUntilUTCDate as jest.Mock).mockReturnValue(undefined)
})

describe('EventUpcoming', () => {
    it('renders a no-event placeholder when event is undefined', () => {
        const { container } = render(<EventUpcoming event={undefined} />)
        expect(container.firstChild).not.toBeNull()
    })

    it('renders the event title', () => {
        render(<EventUpcoming event={baseEvent} />)
        expect(screen.getByText('Test Stargazing Event')).toBeDefined()
    })

    it('shows registered title when user is registered', () => {
        render(<EventUpcoming event={baseEvent} />)
        expect(screen.getByText('Вы зарегистрированы')).toBeDefined()
    })

    it('opens the cancellation dialog when cancel button is clicked', () => {
        render(<EventUpcoming event={baseEvent} />)

        const cancelButton = screen.getByText('Отменить бронирование')
        fireEvent.click(cancelButton)

        expect(screen.getByText('Подтвердите отмену бронирования')).toBeDefined()
    })

    it('closes the cancellation dialog when the cancel button inside dialog is clicked', async () => {
        render(<EventUpcoming event={baseEvent} />)

        fireEvent.click(screen.getByText('Отменить бронирование'))

        expect(screen.getByText('Подтвердите отмену бронирования')).toBeDefined()

        fireEvent.click(screen.getByText('Отмена'))

        await waitFor(() => {
            expect(screen.queryByText('Подтвердите отмену бронирования')).toBeNull()
        })
    })

    it('calls cancelRegistration mutation and unregisters user on success', async () => {
        mockCancelMutate.mockReturnValue({ unwrap: () => Promise.resolve({}) })

        render(<EventUpcoming event={baseEvent} />)

        fireEvent.click(screen.getByText('Отменить бронирование'))
        const confirmButtons = screen.getAllByText('Отменить бронирование')
        fireEvent.click(confirmButtons[confirmButtons.length - 1])

        await waitFor(() => {
            expect(mockCancelMutate).toHaveBeenCalledWith({ eventId: 'event-1' })
        })
    })

    it('shows the awaiting-payment panel with a return-to-payment button for a pending booking', () => {
        const pendingEvent: ApiModel.Event = {
            ...baseEvent,
            bookingStatus: 'pending',
            payment: {
                orderId: 'order-1',
                formUrl: 'https://pay.example/form',
                // Positive remaining time keeps the booking inside its payment hold window.
                expiresInSeconds: 600
            }
        }

        render(<EventUpcoming event={pendingEvent} />)

        expect(screen.getByText('Бронь ожидает оплаты')).toBeDefined()
        expect(screen.getByText('Вернуться к оплате')).toBeDefined()
        // A pending (unpaid) hold must NOT read as a confirmed registration.
        expect(screen.queryByText('Вы зарегистрированы')).toBeNull()
    })

    it('shows a retry-payment prompt for a failed booking instead of a confirmed registration', () => {
        const failedEvent: ApiModel.Event = {
            ...baseEvent,
            bookingStatus: 'failed',
            members: { adults: 2, children: 0, total: 2 }
        }

        render(<EventUpcoming event={failedEvent} />)

        expect(screen.getByText('Оплата не прошла')).toBeDefined()
        expect(screen.getByText('Попробовать оплатить снова')).toBeDefined()
        // A declined/expired attempt must NOT read as a confirmed registration.
        expect(screen.queryByText('Вы зарегистрированы')).toBeNull()
    })

    it('retries the booking with the remembered adults/children and redirects on success', async () => {
        const failedEvent: ApiModel.Event = {
            ...baseEvent,
            bookingStatus: 'failed',
            members: { adults: 3, children: 1, childrenAges: [10], total: 4 }
        }

        mockRetryMutate.mockReturnValue({
            unwrap: () => Promise.resolve({ payment: { formUrl: 'https://pay.example/new', orderId: 'order-2' } })
        })

        render(<EventUpcoming event={failedEvent} />)

        fireEvent.click(screen.getByText('Попробовать оплатить снова'))

        await waitFor(() =>
            expect(mockRetryMutate).toHaveBeenCalledWith({
                adults: 3,
                children: 1,
                childrenAges: [10],
                eventId: 'event-1',
                name: 'Test User',
                phone: undefined
            })
        )
    })

    it('does not update registered state when cancel API call fails (BUG-05 regression)', async () => {
        const rejectedPromise = Promise.reject(new Error('API error'))
        rejectedPromise.catch(() => {})
        mockCancelMutate.mockReturnValue({ unwrap: () => rejectedPromise })

        render(<EventUpcoming event={baseEvent} />)

        fireEvent.click(screen.getByText('Отменить бронирование'))
        const confirmButtons = screen.getAllByText('Отменить бронирование')
        fireEvent.click(confirmButtons[confirmButtons.length - 1])

        await waitFor(() => {
            expect(mockCancelMutate).toHaveBeenCalled()
        })

        expect(screen.getByText('Вы зарегистрированы')).toBeDefined()
    })
})
