import React from 'react'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { API } from '@/api'

import { AstroPhotoForm } from './AstroPhotoForm'

jest.mock('@/api', () => ({
    API: {
        useObjectsGetListQuery: jest.fn(),
        useCategoriesGetListQuery: jest.fn(),
        useEquipmentsGetListQuery: jest.fn()
    },
    // AstroPhotoForm reads `ApiModel.filters` at module scope (to build the
    // zod enum + the "add filter" dropdown options), so the mock needs a real
    // stand-in rather than an empty object.
    ApiModel: {
        filters: { L: 'L', R: 'R', G: 'G', B: 'B', H: 'H', O: 'O', S: 'S', N: 'N' }
    }
}))

// The kit's Jest CJS build renders Input/Select as bare elements with no
// `htmlFor`/id wiring between their `label` prop and the control (see the same
// note in EventForm.test.tsx / AstroObjectForm.test.tsx), so `getByLabelText`
// can't find them as-is. Provide light stand-ins that wrap each control in a
// real `<label>`, and render `Select` as a set of checkboxes (multiple) or
// radios (single) keyed by option value, so multi-select fields stay testable
// without a `user-event` dependency. Calendar/Icon/Popout are stand-ins for
// `DateTimeInput` (the "Дата обработки" field) - same convention as
// EventForm.test.tsx's mock.
jest.mock('simple-react-ui-kit', () => ({
    Calendar: ({ onDateSelect }: { onDateSelect?: (date: string) => void }) => (
        <input
            aria-label={'calendar'}
            type={'text'}
            onChange={(e) => onDateSelect?.(e.target.value)}
        />
    ),
    Icon: () => null,
    Popout: ({ trigger, children }: { trigger?: React.ReactNode; children?: React.ReactNode }) => (
        <div>
            {trigger}
            <div>{children}</div>
        </div>
    ),
    Button: ({
        label,
        onClick,
        disabled,
        type,
        'aria-label': ariaLabel
    }: {
        label?: string
        onClick?: () => void
        disabled?: boolean
        type?: 'button' | 'submit'
        'aria-label'?: string
    }) => (
        <button
            type={type ?? 'button'}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            {label}
        </button>
    ),
    Container: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Input: ({
        label,
        type,
        value,
        error,
        disabled,
        required,
        name,
        placeholder,
        onChange,
        onBlur
    }: {
        label?: string
        type?: string
        value?: string | number
        error?: string
        disabled?: boolean
        required?: boolean
        name?: string
        placeholder?: string
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
        onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
    }) => (
        <label>
            {label}
            <input
                type={type ?? 'text'}
                name={name}
                value={value ?? ''}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                onChange={onChange}
                onBlur={onBlur}
            />
            {error && <span role={'alert'}>{error}</span>}
        </label>
    ),
    Select: ({
        label,
        options,
        value,
        disabled,
        error,
        multiple,
        onSelect
    }: {
        label?: string
        options?: Array<{ key: string | number; value: string }>
        value?: Array<string | number> | string | number
        disabled?: boolean
        error?: string
        multiple?: boolean
        onSelect?: (selected?: Array<{ key: string | number; value: string }>) => void
    }) => {
        const selectedKeys = multiple
            ? ((value as Array<string | number>) ?? [])
            : value != null
              ? [value as string | number]
              : []

        return (
            <div>
                <span>{label}</span>
                {options?.map((option) => {
                    const isSelected = selectedKeys.includes(option.key)
                    return (
                        <label key={option.key}>
                            {option.value}
                            <input
                                type={multiple ? 'checkbox' : 'radio'}
                                checked={isSelected}
                                disabled={disabled}
                                onChange={() => {
                                    if (!multiple) {
                                        onSelect?.([option])
                                        return
                                    }

                                    const nextKeys = isSelected
                                        ? selectedKeys.filter((key) => key !== option.key)
                                        : [...selectedKeys, option.key]

                                    onSelect?.(
                                        nextKeys.length
                                            ? nextKeys.map((key) => ({
                                                  key,
                                                  value: options.find((o) => o.key === key)?.value ?? ''
                                              }))
                                            : undefined
                                    )
                                }}
                            />
                        </label>
                    )
                })}
                {error && <span role={'alert'}>{error}</span>}
            </div>
        )
    }
}))

const defaultCategoriesState = { data: { items: [{ id: 1, title: 'Галактики' }] }, isLoading: false }
const defaultObjectsState = { data: { items: [{ name: 'M31' }] }, isLoading: false }
const defaultEquipmentState = { data: { items: [{ id: 1, brand: 'Sky-Watcher', model: 'HEQ5' }] }, isLoading: false }

beforeEach(() => {
    jest.clearAllMocks()
    ;(API.useCategoriesGetListQuery as jest.Mock).mockReturnValue(defaultCategoriesState)
    ;(API.useObjectsGetListQuery as jest.Mock).mockReturnValue(defaultObjectsState)
    ;(API.useEquipmentsGetListQuery as jest.Mock).mockReturnValue(defaultEquipmentState)
})

describe('AstroPhotoForm', () => {
    it('renders the main fields', () => {
        render(<AstroPhotoForm />)

        expect(screen.getByText('Категория')).toBeDefined()
        expect(screen.getByText('Объекты на фотографии')).toBeDefined()
        expect(screen.getByText('Оборудование')).toBeDefined()
        expect(screen.getByText('Дата обработки')).toBeDefined()
        expect(screen.getByText('Параметры съемки')).toBeDefined()
    })

    it('blocks submit and shows every validation error when required fields are empty', async () => {
        const handleSubmit = jest.fn()
        render(<AstroPhotoForm onSubmit={handleSubmit} />)

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        await waitFor(() => {
            expect(screen.getByText('Выберите хотя бы одну категорию')).toBeDefined()
        })
        expect(screen.getByText('Выберите хотя бы один объект')).toBeDefined()
        expect(screen.getByText('Выберите хотя бы одно оборудование')).toBeDefined()
        expect(screen.getByText('Укажите дату обработки')).toBeDefined()
        expect(screen.getByText('Добавьте хотя бы один фильтр')).toBeDefined()
        expect(handleSubmit).not.toHaveBeenCalled()
    })

    it('adds a filter row with frame/exposure inputs and can remove it', () => {
        render(<AstroPhotoForm />)

        fireEvent.click(screen.getByLabelText('L'))
        fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }))

        expect(screen.getByPlaceholderText('Количество кадров')).toBeDefined()
        expect(screen.getByPlaceholderText('Выдержка (минут)')).toBeDefined()

        fireEvent.click(screen.getByRole('button', { name: 'Удалить фильтр L' }))

        expect(screen.queryByPlaceholderText('Количество кадров')).toBeNull()
    })

    it('enables the save button once all required fields (including a filter) are valid and submits the transformed payload', async () => {
        const handleSubmit = jest.fn()
        render(<AstroPhotoForm onSubmit={handleSubmit} />)

        fireEvent.click(screen.getByLabelText('Галактики'))
        fireEvent.click(screen.getByLabelText('M31'))
        fireEvent.click(screen.getByLabelText('Sky-Watcher HEQ5'))
        fireEvent.change(within(screen.getByTestId('date-calendar')).getByLabelText('calendar'), {
            target: { value: '2026-08-19' }
        })

        fireEvent.click(screen.getByLabelText('L'))
        fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }))

        fireEvent.change(screen.getByPlaceholderText('Количество кадров'), { target: { value: '10' } })
        fireEvent.change(screen.getByPlaceholderText('Выдержка (минут)'), { target: { value: '5' } })

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        await waitFor(() => {
            expect(handleSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    categories: [1],
                    objects: ['M31'],
                    equipments: [1],
                    date: '2026-08-19',
                    filters: { L: { frames: 10, exposure: 5 } }
                })
            )
        })
    })

    // Regression coverage: `append()`ing a new filter row must be caught by
    // full-form validation at submit time even though nothing in the new row
    // has been touched yet - otherwise a `NaN` frames/exposure pair could
    // silently reach `onSubmit`.
    it('blocks submit when a filter is added but its frames/exposure are never touched', async () => {
        const handleSubmit = jest.fn()
        render(<AstroPhotoForm onSubmit={handleSubmit} />)

        fireEvent.click(screen.getByLabelText('Галактики'))
        fireEvent.click(screen.getByLabelText('M31'))
        fireEvent.click(screen.getByLabelText('Sky-Watcher HEQ5'))
        fireEvent.change(within(screen.getByTestId('date-calendar')).getByLabelText('calendar'), {
            target: { value: '2026-08-19' }
        })

        fireEvent.click(screen.getByLabelText('L'))
        fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }))

        // frames/exposure intentionally left untouched (still NaN)
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        await waitFor(() => {
            expect(screen.getByText('Введите количество кадров (целое число больше нуля)')).toBeDefined()
        })
        expect(handleSubmit).not.toHaveBeenCalled()
    })

    it('shows a validation error when a filter is added without frames/exposure filled in', async () => {
        render(<AstroPhotoForm />)

        fireEvent.click(screen.getByLabelText('L'))
        fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }))

        fireEvent.change(screen.getByPlaceholderText('Количество кадров'), { target: { value: '0' } })

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

        await waitFor(() => {
            expect(screen.getByText('Введите количество кадров (целое число больше нуля)')).toBeDefined()
        })
    })

    it('populates the form once initialData arrives, converting stored exposure seconds back to minutes', () => {
        render(
            <AstroPhotoForm
                initialData={{
                    id: 'photo-1',
                    categories: [1],
                    objects: ['M31'],
                    equipments: [1],
                    date: '2026-08-19',
                    filters: { L: { frames: 10, exposure: 300 } }
                }}
            />
        )

        expect(screen.getByTestId('date-trigger')).toHaveTextContent('19.08.2026')
        expect(screen.getByPlaceholderText('Количество кадров')).toHaveValue(10)
        expect(screen.getByPlaceholderText('Выдержка (минут)')).toHaveValue(5)
    })

    it('surfaces a server-side field error returned for the date field', async () => {
        render(<AstroPhotoForm error={{ message: 'Ошибка сохранения', errors: { date: 'Некорректная дата' } }} />)

        expect(await screen.findByText('Некорректная дата')).toBeDefined()
    })
})
