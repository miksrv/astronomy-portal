import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { EventForm } from './EventForm'

jest.mock('@/api', () => ({}))
jest.mock('@/api/constants', () => ({ hosts: { stargazing: '' } }))

// The Jest CJS build of the kit does not expose TextArea; provide light stand-ins.
jest.mock('simple-react-ui-kit', () => {
    return {
        Button: ({ label, onClick }: { label?: string; onClick?: () => void }) => (
            <button onClick={onClick}>{label}</button>
        ),
        Container: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
        Input: ({
            label,
            type,
            value,
            onChange
        }: {
            label?: string
            type?: string
            value?: string
            onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
        }) => (
            <label>
                {label}
                <input
                    type={type}
                    value={value ?? ''}
                    onChange={onChange}
                />
            </label>
        ),
        TextArea: () => null
    }
})

describe('EventForm', () => {
    it('renders the adult ticket price field', () => {
        render(<EventForm />)
        expect(screen.getByText(/Цена билета за взрослого/)).toBeDefined()
    })

    it('submits the entered ticket price', () => {
        const onSubmit = jest.fn()
        const { container } = render(<EventForm onSubmit={onSubmit} />)

        // number inputs order: [0] tickets count, [1] ticket price
        const numberInputs = container.querySelectorAll('input[type="number"]')
        fireEvent.change(numberInputs[1], { target: { value: '750' } })

        fireEvent.click(screen.getByText('Сохранить'))

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ticketPrice: '750' }))
    })
})
