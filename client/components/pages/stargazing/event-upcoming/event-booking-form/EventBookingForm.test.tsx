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
