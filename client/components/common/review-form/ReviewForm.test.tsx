import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'

import { ReviewForm } from './ReviewForm'

jest.mock('@/api', () => ({
    API: {
        useCommentsCreateMutation: jest.fn()
    }
}))

const mockCreateComment = jest.fn()
const defaultMutationState = { isLoading: false }

const fillContent = (value: string) =>
    fireEvent.change(screen.getByPlaceholderText('Поделитесь впечатлениями...'), { target: { value } })

const clickStar = (value: number) =>
    fireEvent.click(screen.getByRole('button', { name: `${value} star${value !== 1 ? 's' : ''}` }))

const clickSubmit = () => fireEvent.click(screen.getByRole('button', { name: 'Отправить отзыв' }))

const VALID_CONTENT = 'Прекрасный вечер для наблюдений!'

beforeEach(() => {
    jest.clearAllMocks()
    ;(API.useCommentsCreateMutation as jest.Mock).mockReturnValue([mockCreateComment, defaultMutationState])
})

describe('ReviewForm', () => {
    it('renders the rating stars, content field and submit button', () => {
        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        expect(screen.getByRole('group', { name: 'Оценка' })).toBeDefined()
        expect(screen.getByPlaceholderText('Поделитесь впечатлениями...')).toBeDefined()
        expect(screen.getByRole('button', { name: 'Отправить отзыв' })).toBeDefined()
    })

    it('shows validation errors and does not call the mutation when submitted empty', async () => {
        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        clickSubmit()

        await waitFor(() => {
            expect(screen.getByText('Пожалуйста, выберите оценку')).toBeDefined()
        })
        expect(screen.getByText('Пожалуйста, напишите отзыв')).toBeDefined()
        expect(mockCreateComment).not.toHaveBeenCalled()
    })

    it('shows a validation error for content that is too short', async () => {
        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        clickStar(5)
        fillContent('short')
        clickSubmit()

        await waitFor(() => {
            expect(screen.getByText(/^Отзыв должен содержать не менее/)).toBeDefined()
        })
        expect(mockCreateComment).not.toHaveBeenCalled()
    })

    it('shows a validation error for content over the max length', async () => {
        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        clickStar(5)
        fillContent('a'.repeat(1001))
        clickSubmit()

        await waitFor(() => {
            expect(screen.getByText(/^Отзыв не должен превышать/)).toBeDefined()
        })
        expect(mockCreateComment).not.toHaveBeenCalled()
    })

    it('requires a rating for an event review but not for a photo review', async () => {
        const { rerender } = render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        fillContent(VALID_CONTENT)
        clickSubmit()

        await waitFor(() => {
            expect(screen.getByText('Пожалуйста, выберите оценку')).toBeDefined()
        })
        expect(mockCreateComment).not.toHaveBeenCalled()

        mockCreateComment.mockReturnValue({ unwrap: () => Promise.resolve({}) })

        rerender(
            <ReviewForm
                entityType={'photo'}
                entityId={'photo-1'}
            />
        )

        fillContent(VALID_CONTENT)
        clickSubmit()

        await waitFor(() => {
            expect(mockCreateComment).toHaveBeenCalledWith(
                expect.objectContaining({ entityType: 'photo', rating: undefined })
            )
        })
        expect(screen.queryByText('Пожалуйста, выберите оценку')).toBeNull()
    })

    it('clears the content error once the field is edited again after a failed submit', async () => {
        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        clickStar(5)
        clickSubmit()

        await waitFor(() => {
            expect(screen.getByText('Пожалуйста, напишите отзыв')).toBeDefined()
        })

        fillContent(VALID_CONTENT)

        await waitFor(() => {
            expect(screen.queryByText('Пожалуйста, напишите отзыв')).toBeNull()
        })
    })

    it('submits the trimmed content and selected rating', async () => {
        mockCreateComment.mockReturnValue({ unwrap: () => Promise.resolve({}) })

        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        clickStar(4)
        fillContent(`  ${VALID_CONTENT}  `)
        clickSubmit()

        await waitFor(() => {
            expect(mockCreateComment).toHaveBeenCalledWith({
                content: VALID_CONTENT,
                entityId: 'event-1',
                entityType: 'event',
                rating: 4
            })
        })
    })

    it('shows the success message and calls onSuccess once submission resolves', async () => {
        mockCreateComment.mockReturnValue({ unwrap: () => Promise.resolve({}) })
        const onSuccess = jest.fn()

        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
                onSuccess={onSuccess}
            />
        )

        clickStar(5)
        fillContent(VALID_CONTENT)
        clickSubmit()

        await waitFor(() => {
            expect(screen.getByText('Отзыв опубликован!')).toBeDefined()
        })
        expect(onSuccess).toHaveBeenCalled()
    })

    it('shows the API error message and a server-side field error', async () => {
        mockCreateComment.mockReturnValue({
            unwrap: () =>
                Promise.reject({
                    message: 'Не удалось сохранить отзыв',
                    errors: { content: 'Текст отзыва содержит запрещённые слова' }
                })
        })

        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
            />
        )

        clickStar(5)
        fillContent(VALID_CONTENT)
        clickSubmit()

        expect(await screen.findByText('Не удалось сохранить отзыв')).toBeDefined()
        expect(await screen.findByText('Текст отзыва содержит запрещённые слова')).toBeDefined()
    })

    it('defers the actual submit to onOptimisticSubmit when provided', async () => {
        mockCreateComment.mockReturnValue({ unwrap: () => Promise.resolve({}) })
        const onOptimisticSubmit = jest.fn((content: string, rating: number, run: () => Promise<void>) => {
            void run()
        })

        render(
            <ReviewForm
                entityType={'event'}
                entityId={'event-1'}
                onOptimisticSubmit={onOptimisticSubmit}
            />
        )

        clickStar(3)
        fillContent(VALID_CONTENT)
        clickSubmit()

        await waitFor(() => {
            expect(onOptimisticSubmit).toHaveBeenCalledWith(VALID_CONTENT, 3, expect.any(Function))
        })
        await waitFor(() => {
            expect(mockCreateComment).toHaveBeenCalled()
        })
    })
})
