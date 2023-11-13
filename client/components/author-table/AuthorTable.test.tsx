import { renderWithStore } from '@/setupTests.config'
import { fireEvent, screen } from '@testing-library/react'
import React from 'react'

import AuthorTable from './AuthorTable'

const customInitialState = {
    auth: {
        isAuth: true
    }
}

describe('AuthorTable', () => {
    const authorsMock = [
        {
            id: 1,
            link: 'http://example.com/1',
            name: 'Author 1',
            photo_count: 10
        },
        {
            id: 2,
            link: 'http://example.com/2',
            name: 'Author 2',
            photo_count: 15
        }
    ]

    it('renders author table with data', () => {
        renderWithStore(
            <AuthorTable authors={authorsMock} />,
            customInitialState
        )

        expect(screen.getByText('Author 1')).toBeInTheDocument()
        expect(screen.getByText('Author 2')).toBeInTheDocument()
        expect(screen.getByText('http://example.com/1')).toBeInTheDocument()
        expect(screen.getByText('http://example.com/2')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('renders "No data to display" message when there are no authors', () => {
        renderWithStore(<AuthorTable authors={[]} />, customInitialState)

        expect(
            screen.getByText('Нет данных для отображения')
        ).toBeInTheDocument()
    })

    it('calls onClickEdit and onClickDelete when buttons are clicked', () => {
        const onClickEditMock = jest.fn()
        const onClickDeleteMock = jest.fn()

        renderWithStore(
            <AuthorTable
                authors={[authorsMock[0]]}
                onClickEdit={onClickEditMock}
                onClickDelete={onClickDeleteMock}
            />,
            customInitialState
        )

        const editButton = screen.getByTestId('table-cell-edit')
        const removeButton = screen.getByTestId('table-cell-remove')

        expect(editButton).toBeInTheDocument()
        expect(removeButton).toBeInTheDocument()

        fireEvent.click(editButton)

        expect(onClickEditMock).toHaveBeenCalledWith(1)

        fireEvent.click(removeButton)

        expect(onClickDeleteMock).toHaveBeenCalledWith(1)
    })

    it('displays loader while loading', () => {
        renderWithStore(
            <AuthorTable authors={authorsMock} />,
            customInitialState
        )

        expect(screen.getByTestId('authors-loader')).toBeInTheDocument()
    })
})
