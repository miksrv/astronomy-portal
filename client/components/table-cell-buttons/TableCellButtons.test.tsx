import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import TableCellButtons from './TableCellButtons'

describe('TableCellButtons', () => {
    it('renders the name correctly', () => {
        const itemName = 'John Doe'
        render(<TableCellButtons name={itemName} />)
        expect(screen.getByText(itemName)).toBeInTheDocument()
    })

    it('renders edit and delete buttons when isAuth is true', () => {
        render(
            <TableCellButtons
                isAuth={true}
                onClickEdit={() => {}}
                onClickDelete={() => {}}
            />
        )

        const editButton = screen.getByTestId('table-cell-edit')
        const removeButton = screen.getByTestId('table-cell-remove')

        expect(editButton).toBeInTheDocument()
        expect(removeButton).toBeInTheDocument()
    })

    it('calls onClickEdit when edit button is clicked', () => {
        const onClickEdit = jest.fn()

        render(
            <TableCellButtons
                isAuth={true}
                onClickEdit={onClickEdit}
            />
        )
        const editButton = screen.getByTestId('table-cell-edit')

        fireEvent.click(editButton)

        expect(onClickEdit).toHaveBeenCalled()
    })

    it('calls onClickDelete when delete button is clicked', () => {
        const onClickDelete = jest.fn()

        render(
            <TableCellButtons
                isAuth={true}
                onClickDelete={onClickDelete}
            />
        )

        const removeButton = screen.getByTestId('table-cell-remove')

        fireEvent.click(removeButton)

        expect(onClickDelete).toHaveBeenCalled()
    })

    it('does not render edit and delete buttons when isAuth is false', () => {
        render(<TableCellButtons isAuth={false} />)

        const editButton = screen.queryByRole('button', {
            name: 'edit outline'
        })

        const removeButton = screen.queryByRole('button', { name: 'remove' })

        expect(editButton).not.toBeInTheDocument()
        expect(removeButton).not.toBeInTheDocument()
    })
})
