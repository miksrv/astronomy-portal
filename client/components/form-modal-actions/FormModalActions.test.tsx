import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import FormModalActions from './FormModalActions'

describe('FormModalActions', () => {
    it('renders the "Сохранить" button correctly', () => {
        render(<FormModalActions />)
        const saveButton = screen.getByRole('button', { name: 'Сохранить' })
        expect(saveButton).toBeInTheDocument()
    })

    it('calls onClickSave when the "Сохранить" button is clicked', () => {
        const onClickSave = jest.fn()
        render(<FormModalActions onClickSave={onClickSave} />)
        const saveButton = screen.getByRole('button', { name: 'Сохранить' })
        fireEvent.click(saveButton)
        expect(onClickSave).toHaveBeenCalled()
    })

    it('renders the "Закрыть" button correctly', () => {
        render(<FormModalActions />)
        const closeButton = screen.getByRole('button', { name: 'Закрыть' })
        expect(closeButton).toBeInTheDocument()
    })

    it('calls onClickClose when the "Закрыть" button is clicked', () => {
        const onClickClose = jest.fn()
        render(<FormModalActions onClickClose={onClickClose} />)
        const closeButton = screen.getByRole('button', { name: 'Закрыть' })
        fireEvent.click(closeButton)
        expect(onClickClose).toHaveBeenCalled()
    })

    it('disables the "Сохранить" button when disabled is true', () => {
        render(<FormModalActions disabled={true} />)
        const saveButton = screen.getByRole('button', { name: 'Сохранить' })
        expect(saveButton).toBeDisabled()
    })

    it('shows loading state on the "Сохранить" button when loading is true', () => {
        render(<FormModalActions loading={true} />)
        const saveButton = screen.getByRole('button', { name: 'Сохранить' })
        expect(saveButton).toHaveClass('loading')
    })
})
