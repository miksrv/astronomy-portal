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
        render(<TableCellButtons isAuth={true} />)
        const editButton = screen.getByRole('button', { name: 'edit outline' })
        const deleteButton = screen.getByRole('button', { name: 'remove' })
        expect(editButton).toBeInTheDocument()
        expect(deleteButton).toBeInTheDocument()
    })

    it('calls onClickEdit when edit button is clicked', () => {
        const onClickEdit = jest.fn()
        render(
            <TableCellButtons
                isAuth={true}
                onClickEdit={onClickEdit}
            />
        )
        const editButton = screen.getByRole('button', { name: 'edit outline' })
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
        const deleteButton = screen.getByRole('button', { name: 'remove' })
        fireEvent.click(deleteButton)
        expect(onClickDelete).toHaveBeenCalled()
    })

    it('does not render edit and delete buttons when isAuth is false', () => {
        render(<TableCellButtons isAuth={false} />)
        const editButton = screen.queryByRole('button', {
            name: 'edit outline'
        })
        const deleteButton = screen.queryByRole('button', { name: 'remove' })
        expect(editButton).not.toBeInTheDocument()
        expect(deleteButton).not.toBeInTheDocument()
    })
})
