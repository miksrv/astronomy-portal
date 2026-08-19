import React from 'react'

import { fireEvent, render, screen, within } from '@testing-library/react'

import { EventForm } from './EventForm'

jest.mock('@/api', () => ({}))
jest.mock('@/api/constants', () => ({ hosts: { stargazing: '' } }))

// The Jest CJS build of the kit does not expose TextArea/Checkbox/Popout/Calendar/
// Select/Icon/Skeleton; provide light stand-ins. Popout renders its trigger and content
// unconditionally (no open/closed state) so tests can interact with the date
// picker's calendar/time controls without simulating a click-to-open first.
jest.mock('simple-react-ui-kit', () => {
    return {
        Button: ({ label, onClick, disabled }: { label?: string; onClick?: () => void; disabled?: boolean }) => (
            <button
                onClick={onClick}
                disabled={disabled}
            >
                {label}
            </button>
        ),
        Calendar: ({ onDateSelect }: { onDateSelect?: (date: string) => void }) => (
            <input
                aria-label={'calendar'}
                type={'text'}
                onChange={(e) => onDateSelect?.(e.target.value)}
            />
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
        Container: ({ title, children }: { title?: string; children?: React.ReactNode }) => (
            <section>
                {title && <h2>{title}</h2>}
                {children}
            </section>
        ),
        Icon: () => null,
        Input: ({
            label,
            type,
            value,
            error,
            disabled,
            onChange
        }: {
            label?: string
            type?: string
            value?: string
            error?: string
            disabled?: boolean
            onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
        }) => (
            <label>
                {label}
                <input
                    type={type}
                    value={value ?? ''}
                    disabled={disabled}
                    onChange={onChange}
                />
                {error && <span role={'alert'}>{error}</span>}
            </label>
        ),
        // Popout is not given a forwardRef stand-in here: DateTimePicker only
        // calls `ref.current?.close()` from its own "Готово" button, which no
        // test below relies on, so the resulting "cannot be given a ref"
        // console warning is harmless noise, not a real defect.
        Popout: ({ trigger, children }: { trigger?: React.ReactNode; children?: React.ReactNode }) => (
            <div>
                {trigger}
                <div>{children}</div>
            </div>
        ),
        Select: ({
            label,
            options,
            value,
            disabled,
            onSelect
        }: {
            label?: string
            options?: Array<{ key: string; value: string }>
            value?: string
            disabled?: boolean
            onSelect?: (selected?: Array<{ key: string; value: string }>) => void
        }) => (
            <label>
                {label}
                <select
                    disabled={disabled}
                    value={value ?? ''}
                    onChange={(e) =>
                        onSelect?.(e.target.value ? [{ key: e.target.value, value: e.target.value }] : undefined)
                    }
                >
                    <option value={''} />
                    {options?.map((option) => (
                        <option
                            key={option.key}
                            value={option.key}
                        >
                            {option.value}
                        </option>
                    ))}
                </select>
            </label>
        ),
        Skeleton: () => null,
        TextArea: ({ error }: { error?: string }) => (error ? <span role={'alert'}>{error}</span> : null)
    }
})

// Drives one DateTimePicker instance (identified by its `testId`) through the
// mocked Calendar + hour/minute Selects — the calendar must be set first,
// since the real component only commits an hour/minute change once a date
// already exists (see DateTimePicker.tsx).
const setDateTime = (testId: string, date: string, hour: string, minute: string) => {
    const calendarInput = within(screen.getByTestId(`${testId}-calendar`)).getByLabelText('calendar')
    fireEvent.change(calendarInput, { target: { value: date } })

    const hourSelect = within(screen.getByTestId(`${testId}-hour`)).getByRole('combobox')
    fireEvent.change(hourSelect, { target: { value: hour } })

    const minuteSelect = within(screen.getByTestId(`${testId}-minute`)).getByRole('combobox')
    fireEvent.change(minuteSelect, { target: { value: minute } })
}

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
        const ticketPriceInput = numberInputs[1]

        if (!ticketPriceInput) {
            throw new Error('Ticket price input not found')
        }

        fireEvent.change(ticketPriceInput, { target: { value: '750' } })

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

    it('prefills the date picker triggers with a formatted value when editing an event', () => {
        render(
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

        expect(screen.getByTestId('date-trigger').textContent).toContain('15.08.2026, 20:00')
        expect(screen.getByTestId('registration-start-trigger').textContent).toContain('01.08.2026, 05:00')
        expect(screen.getByTestId('registration-end-trigger').textContent).toContain('14.08.2026, 05:00')
    })

    // Regression coverage for the 2026-08-19 incident: registrationEnd was set
    // later than the event's own date, which the booking-status UI had no
    // state for (see EventUpcoming.tsx) — caught here before it ever reaches
    // the backend's identical Events.invalidRegistrationWindow check.
    it('blocks submit and shows an error when registrationEnd is later than the event date', () => {
        const onSubmit = jest.fn()
        render(<EventForm onSubmit={onSubmit} />)

        setDateTime('date', '2026-08-19', '22', '00')
        setDateTime('registration-start', '2026-08-16', '12', '00')
        setDateTime('registration-end', '2026-08-20', '00', '00')

        fireEvent.click(screen.getByText('Сохранить'))

        expect(onSubmit).not.toHaveBeenCalled()
        expect(screen.getByText(/закрываться не позднее даты и времени проведения/)).toBeDefined()
    })

    it('blocks submit and shows an error when registrationStart is not before registrationEnd', () => {
        const onSubmit = jest.fn()
        render(<EventForm onSubmit={onSubmit} />)

        setDateTime('date', '2026-08-19', '22', '00')
        setDateTime('registration-start', '2026-08-19', '21', '00')
        setDateTime('registration-end', '2026-08-19', '20', '00')

        fireEvent.click(screen.getByText('Сохранить'))

        expect(onSubmit).not.toHaveBeenCalled()
        expect(screen.getByText(/должна открываться раньше, чем закрываться/)).toBeDefined()
    })

    it('allows submit once the registration window is fixed', () => {
        const onSubmit = jest.fn()
        render(<EventForm onSubmit={onSubmit} />)

        setDateTime('date', '2026-08-19', '22', '00')
        setDateTime('registration-start', '2026-08-16', '12', '00')
        setDateTime('registration-end', '2026-08-20', '00', '00')

        fireEvent.click(screen.getByText('Сохранить'))
        expect(onSubmit).not.toHaveBeenCalled()

        setDateTime('registration-end', '2026-08-19', '21', '00')
        fireEvent.click(screen.getByText('Сохранить'))

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ registrationEnd: '2026-08-19T21:00' }))
    })

    // Regression coverage: a create/patch mutation's validation error must
    // surface next to the field it belongs to, not just in a generic banner
    // the admin has to cross-reference with the network tab.
    it('shows a server validation error next to the field it belongs to', () => {
        render(<EventForm error={{ messages: { title: 'Слишком длинный заголовок' } }} />)

        expect(screen.getByText('Слишком длинный заголовок')).toBeDefined()
    })
})
