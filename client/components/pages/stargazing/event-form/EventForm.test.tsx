import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { EventForm } from './EventForm'

jest.mock('@/api', () => ({}))
jest.mock('@/api/constants', () => ({ hosts: { stargazing: '' } }))

// The Jest CJS build of the kit does not expose TextArea/Checkbox; provide light stand-ins.
jest.mock('simple-react-ui-kit', () => {
    return {
        Button: ({ label, onClick }: { label?: string; onClick?: () => void }) => (
            <button onClick={onClick}>{label}</button>
        ),
        Checkbox: ({
            label,
            checked,
            onChange
        }: {
            label?: string
            checked?: boolean
            onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
        }) => (
            <label>
                {label}
                <input
                    type={'checkbox'}
                    checked={checked ?? false}
                    onChange={onChange}
                />
            </label>
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

    it('prefills the ticket price from initialData when editing an event', () => {
        const { container } = render(
            <EventForm
                initialData={{
                    id: 'event-1',
                    title: 'Test Event',
                    ticketPrice: 750
                }}
            />
        )

        const numberInputs = container.querySelectorAll('input[type="number"]')
        expect((numberInputs[1] as HTMLInputElement).value).toBe('750')
    })

    it('prefills date fields with a datetime-local-compatible value (YYYY-MM-DDTHH:mm) when editing an event', () => {
        const { container } = render(
            <EventForm
                initialData={{
                    id: 'event-1',
                    title: 'Test Event',
                    // Stored/returned as UTC; Orenburg (Asia/Yekaterinburg) is UTC+5.
                    date: { date: '2026-08-15 15:00:00.000000', timezone_type: 3, timezone: 'UTC' },
                    registrationStart: { date: '2026-08-01 00:00:00.000000', timezone_type: 3, timezone: 'UTC' },
                    registrationEnd: { date: '2026-08-14 00:00:00.000000', timezone_type: 3, timezone: 'UTC' }
                }}
            />
        )

        const dateInputs = container.querySelectorAll('input[type="datetime-local"]')

        expect((dateInputs[0] as HTMLInputElement).value).toBe('2026-08-15T20:00')
        expect((dateInputs[1] as HTMLInputElement).value).toBe('2026-08-01T05:00')
        expect((dateInputs[2] as HTMLInputElement).value).toBe('2026-08-14T05:00')
    })
})
