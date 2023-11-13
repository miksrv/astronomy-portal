import { renderWithStore } from '@/setupTests.config'
import { fireEvent, screen } from '@testing-library/react'
import React from 'react'

import CategoryTable from './CategoryTable'

const customInitialState = {
    auth: {
        isAuth: true
    }
}

const categories = [
    { id: 1, name: 'Category 1', object_count: 10 },
    { id: 2, name: 'Category 2', object_count: 15 }
]

describe('CategoryTable', () => {
    it('renders CategoryTable with loading state', () => {
        renderWithStore(<CategoryTable loading />, customInitialState)

        expect(
            screen.getByText('Нет данных для отображения')
        ).toBeInTheDocument()
    })

    it('renders CategoryTable with categories', () => {
        renderWithStore(
            <CategoryTable categories={categories} />,
            customInitialState
        )

        expect(screen.getByText('Category 1')).toBeInTheDocument()
        expect(screen.getByText('Category 2')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('calls onClickEdit and onClickDelete when buttons are clicked', () => {
        const onClickEditMock = jest.fn()
        const onClickDeleteMock = jest.fn()

        renderWithStore(
            <CategoryTable
                categories={categories}
                onClickDelete={onClickDeleteMock}
                onClickEdit={onClickEditMock}
            />,
            customInitialState
        )

        const editButton = screen.getAllByTestId('table-cell-edit')
        const removeButton = screen.getAllByTestId('table-cell-remove')

        expect(editButton?.length).toBe(2)
        expect(removeButton?.length).toBe(2)

        fireEvent.click(editButton?.[0])

        expect(onClickEditMock).toHaveBeenCalledWith(1)

        fireEvent.click(removeButton?.[0])

        expect(onClickDeleteMock).toHaveBeenCalledWith(1)
    })
})
