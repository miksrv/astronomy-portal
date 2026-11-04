import React from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'

import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

const mockRouter = {
    push: jest.fn(() => Promise.resolve(true)),
    beforePopState: jest.fn(),
    asPath: '/objects/form?id=M_51'
}

jest.mock('next/router', () => ({
    useRouter: () => mockRouter
}))

const { push, beforePopState } = mockRouter

const Page: React.FC<{ dirty: boolean }> = ({ dirty }) => {
    const guard = useUnsavedChangesGuard(dirty)

    return (
        <>
            <a href={'/objects'}>{'Объекты'}</a>
            <button
                type={'button'}
                onClick={() => guard.navigate('/objects/M_51')}
            >
                {'Отмена'}
            </button>
            {guard.dialog}
        </>
    )
}

beforeEach(() => jest.clearAllMocks())

describe('useUnsavedChangesGuard', () => {
    it('lets a link through when nothing changed', () => {
        render(<Page dirty={false} />)

        fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))

        expect(push).toHaveBeenCalledWith('/objects/M_51')
        expect(screen.queryByText('Уйти без сохранения?')).toBeNull()
    })

    it('asks before following a link from a changed form, and stays', () => {
        render(<Page dirty={true} />)

        const event = fireEvent.click(screen.getByText('Объекты'))

        expect(event).toBe(false) // the browser's navigation was prevented
        expect(screen.getByText('Уйти без сохранения?')).toBeDefined()

        fireEvent.click(screen.getByRole('button', { name: 'Остаться' }))

        expect(screen.queryByText('Уйти без сохранения?')).toBeNull()
        expect(push).not.toHaveBeenCalled()
    })

    it('leaves where the editor wanted to go once confirmed', () => {
        render(<Page dirty={true} />)

        fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
        fireEvent.click(screen.getByRole('button', { name: 'Уйти без сохранения' }))

        expect(push).toHaveBeenCalledWith('/objects/M_51')
    })

    it('blocks the browser back button of a changed form', () => {
        render(<Page dirty={true} />)

        const handler = beforePopState.mock.calls[0][0] as () => boolean

        let result = true
        act(() => {
            result = handler()
        })

        expect(result).toBe(false)
        expect(screen.getByText('Уйти без сохранения?')).toBeDefined()
    })
})
