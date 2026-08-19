import React from 'react'

import { fireEvent, render, waitFor, within } from '@testing-library/react'

import { API, useAppDispatch, useAppSelector } from '@/api'
import { REVIEW_INLINE_FORM_ID } from '@/utils/constants'

import { EventReviews } from './EventReviews'

jest.mock('@/api', () => ({
    API: {
        useCommentsGetListQuery: jest.fn(),
        useCommentsCreateMutation: jest.fn(),
        useCommentsDeleteMutation: jest.fn(),
        endpoints: {
            commentsGetList: {
                initiate: jest.fn()
            }
        }
    },
    useAppDispatch: jest.fn(),
    useAppSelector: jest.fn()
}))

const mockUser = { id: 'user-1', name: 'Тестовый Пользователь' }

const baseListData = {
    items: [],
    total: 0,
    canReview: true,
    hasReviewed: false
}

// Resolves only once `resolveCreate()` is called - lets the test assert on
// the optimistic review while the mutation is still "in flight".
let resolveCreate: () => void
const mockCreateComment = jest.fn()
const mockUnwrap = jest.fn()

beforeEach(() => {
    jest.clearAllMocks()

    ;(useAppSelector as jest.Mock).mockImplementation((selector) =>
        selector({ auth: { isAuth: true, user: mockUser } })
    )
    // Mirrors what a real store does for an RTK Query `initiate()` action:
    // dispatching it returns the same `{ unwrap }` result object.
    ;(useAppDispatch as jest.Mock).mockReturnValue(jest.fn((action) => action))

    ;(API.useCommentsGetListQuery as jest.Mock).mockReturnValue({ data: baseListData, isFetching: false })
    ;(API.useCommentsDeleteMutation as jest.Mock).mockReturnValue([jest.fn()])

    mockUnwrap.mockImplementation(
        () =>
            new Promise((resolve) => {
                resolveCreate = () => resolve({})
            })
    )
    mockCreateComment.mockReturnValue({ unwrap: mockUnwrap })
    ;(API.useCommentsCreateMutation as jest.Mock).mockReturnValue([mockCreateComment, { isLoading: false }])
    ;(API.endpoints.commentsGetList.initiate as jest.Mock).mockReturnValue({
        unwrap: () => Promise.resolve(baseListData)
    })
})

describe('EventReviews', () => {
    it('shows the submitted review immediately, before the mutation resolves', async () => {
        render(<EventReviews eventId={'event-1'} />)

        const inlineForm = within(document.getElementById(REVIEW_INLINE_FORM_ID) as HTMLElement)

        fireEvent.click(inlineForm.getByLabelText('5 stars'))
        fireEvent.change(inlineForm.getByPlaceholderText('Поделитесь впечатлениями...'), {
            target: { value: 'Отличное мероприятие, всем рекомендую!' }
        })
        fireEvent.click(inlineForm.getByText('Отправить отзыв'))

        const reviewCard = await waitFor(() => {
            const card = document.querySelector('.card')
            if (!card) {
                throw new Error('optimistic review card not rendered yet')
            }
            return within(card as HTMLElement)
        })

        expect(reviewCard.getByText('Отличное мероприятие, всем рекомендую!')).toBeDefined()
        expect(reviewCard.getByText('Тестовый Пользователь')).toBeDefined()
        expect(reviewCard.getByText('Отправка…')).toBeDefined()

        // The mutation hasn't resolved yet - createComment was called, but the
        // optimistic entry is standing in for the real, still-pending review.
        expect(mockCreateComment).toHaveBeenCalledWith(
            expect.objectContaining({ content: 'Отличное мероприятие, всем рекомендую!' })
        )

        resolveCreate()
    })

    it('does not render a delete button on the optimistic (pending) review', async () => {
        render(<EventReviews eventId={'event-1'} />)

        const inlineForm = within(document.getElementById(REVIEW_INLINE_FORM_ID) as HTMLElement)

        fireEvent.click(inlineForm.getByLabelText('5 stars'))
        fireEvent.change(inlineForm.getByPlaceholderText('Поделитесь впечатлениями...'), {
            target: { value: 'Ещё один отзыв о поездке' }
        })
        fireEvent.click(inlineForm.getByText('Отправить отзыв'))

        const reviewCard = await waitFor(() => {
            const card = document.querySelector('.card')
            if (!card) {
                throw new Error('optimistic review card not rendered yet')
            }
            return within(card as HTMLElement)
        })

        expect(reviewCard.getByText('Ещё один отзыв о поездке')).toBeDefined()
        expect(reviewCard.queryByText('Удалить')).toBeNull()

        resolveCreate()
    })
})
