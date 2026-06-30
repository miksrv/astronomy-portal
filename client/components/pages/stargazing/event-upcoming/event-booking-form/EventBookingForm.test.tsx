import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API, useAppSelector } from '@/api'

import { EventBookingForm } from './EventBookingForm'

jest.mock('@/api', () => ({
    API: {
        useEventsRegistrationPostMutation: jest.fn()
    },
    useAppSelector: jest.fn()
}))

const mockMutate = jest.fn()
const defaultMutationState = {
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: undefined
}

beforeEach(() => {
    jest.clearAllMocks()
    ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([mockMutate, defaultMutationState])
    ;(useAppSelector as jest.Mock).mockReturnValue({ name: 'Test User', phone: '' })
})

describe('EventBookingForm', () => {
    it('renders the name input pre-filled from user state', () => {
        render(<EventBookingForm eventId='event-1' />)
        const nameInput = screen.getByDisplayValue('Test User')
        expect(nameInput).toBeDefined()
    })

    it('renders the submit button', () => {
        render(<EventBookingForm eventId='event-1' />)
        expect(screen.getByText('Забронировать')).toBeDefined()
    })

    it('calls bookEvent mutation when form is submitted with eventId', async () => {
        mockMutate.mockResolvedValue({})
        render(<EventBookingForm eventId='event-1' />)

        fireEvent.click(screen.getByText('Забронировать'))

        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'event-1', name: 'Test User' }))
        })
    })

    it('does not call bookEvent when eventId is undefined', async () => {
        render(<EventBookingForm eventId={undefined} />)

        fireEvent.click(screen.getByText('Забронировать'))

        await waitFor(() => {
            expect(mockMutate).not.toHaveBeenCalled()
        })
    })

    it('shows error message when isError is true', () => {
        ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([
            mockMutate,
            {
                ...defaultMutationState,
                isError: true,
                error: { messages: { error: 'Ошибка регистрации' } }
            }
        ])

        render(<EventBookingForm eventId='event-1' />)

        expect(screen.getByText('Ошибка регистрации')).toBeDefined()
    })

    it('shows success message when isSuccess is true', () => {
        ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([
            mockMutate,
            { ...defaultMutationState, isSuccess: true }
        ])

        render(<EventBookingForm eventId='event-1' />)

        expect(screen.getByText('Вы зарегистрировались на мероприятие')).toBeDefined()
    })

    it('does not show the registration success message for a paid event (defers to payment)', () => {
        ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([
            mockMutate,
            { ...defaultMutationState, isSuccess: true }
        ])

        render(
            <EventBookingForm
                eventId='event-1'
                ticketPrice={500}
            />
        )

        expect(screen.queryByText('Вы зарегистрировались на мероприятие')).toBeNull()
    })

    it('renders the price summary and payment button label for a paid event', () => {
        render(
            <EventBookingForm
                eventId='event-1'
                ticketPrice={500}
            />
        )

        expect(screen.getByTestId('price-summary')).toBeDefined()
        expect(screen.getByText('Перейти к оплате')).toBeDefined()
        // Default 1 adult × 500 ₽
        expect(screen.getByText('500 ₽')).toBeDefined()
    })

    it('does not render the price summary for a free event', () => {
        render(<EventBookingForm eventId='event-1' />)

        expect(screen.queryByTestId('price-summary')).toBeNull()
        expect(screen.getByText('Забронировать')).toBeDefined()
    })

    it('submits a paid booking and defers confirmation to the payment return (no onSuccessSubmit)', async () => {
        // Paid booking → API responds with a bank payment URL; the component
        // redirects to the bank and must NOT mark the user as registered yet.
        mockMutate.mockResolvedValue({
            data: { result: true, payment: { formUrl: 'https://bank/pay', orderId: 'o1', amount: 500 } }
        })

        const onSuccess = jest.fn()

        const { rerender } = render(
            <EventBookingForm
                eventId='event-1'
                ticketPrice={500}
                onSuccessSubmit={onSuccess}
            />
        )

        fireEvent.click(screen.getByText('Перейти к оплате'))

        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'event-1' }))
        })

        // Even once the mutation reports success, confirmation is deferred until
        // the user returns from the bank, so onSuccessSubmit stays uncalled.
        ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([
            mockMutate,
            { ...defaultMutationState, isSuccess: true }
        ])

        rerender(
            <EventBookingForm
                eventId='event-1'
                ticketPrice={500}
                onSuccessSubmit={onSuccess}
            />
        )

        await waitFor(() => {
            expect(onSuccess).not.toHaveBeenCalled()
        })
    })

    it('calls onSuccessSubmit callback when submission succeeds', async () => {
        const onSuccess = jest.fn()

        const { rerender } = render(
            <EventBookingForm
                eventId='event-1'
                onSuccessSubmit={onSuccess}
            />
        )

        fireEvent.click(screen.getByText('Забронировать'))
        ;(API.useEventsRegistrationPostMutation as jest.Mock).mockReturnValue([
            mockMutate,
            { ...defaultMutationState, isSuccess: true }
        ])

        rerender(
            <EventBookingForm
                eventId='event-1'
                onSuccessSubmit={onSuccess}
            />
        )

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled()
        })
    })
})
