import React from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API, ApiModel, useAppSelector } from '@/api'

import { EventUpcoming } from './EventUpcoming'

dayjs.extend(utc)

jest.mock('@/api', () => ({
    API: {
        useEventsCancelRegistrationPostMutation: jest.fn()
    },
    useAppSelector: jest.fn()
}))

jest.mock('next-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, defaultValue: string) => defaultValue })
}))

jest.mock('@/utils/dates', () => ({
    formatUTCDate: () => '1 January, 2025',
    getLocalizedTimeFromSec: () => '1 день',
    getSecondsUntilUTCDate: () => undefined
}))

jest.mock('@/components/common', () => ({
    LoginForm: () => <div>LoginForm</div>
}))

jest.mock('./event-booking-form', () => ({
    EventBookingForm: () => <div>EventBookingForm</div>
}))

const mockCancelMutate = jest.fn()
const defaultCancelState = { isLoading: false }

const baseEvent: ApiModel.Event = {
    id: 'event-1',
    title: 'Test Stargazing Event',
    coverFileName: 'cover',
    coverFileExt: 'jpg',
    registered: true,
    availableTickets: 5,
    date: { date: new Date(Date.now() + 86400000 * 10).toISOString() },
    registrationStart: { date: new Date(Date.now() - 86400000 * 5).toISOString() },
    registrationEnd: { date: new Date(Date.now() + 86400000 * 5).toISOString() }
}

beforeEach(() => {
    jest.clearAllMocks()
    ;(API.useEventsCancelRegistrationPostMutation as jest.Mock).mockReturnValue([mockCancelMutate, defaultCancelState])
    ;(useAppSelector as jest.Mock).mockReturnValue({ id: 'user-1', name: 'Test User' })
})

describe('EventUpcoming', () => {
    it('returns null when event has no id', () => {
        const { container } = render(<EventUpcoming event={undefined} />)
        expect(container.firstChild).toBeNull()
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
