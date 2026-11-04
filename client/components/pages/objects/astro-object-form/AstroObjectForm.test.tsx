import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'

import { AstroObjectForm } from './AstroObjectForm'

jest.mock('@/api', () => ({
    API: {
        useCategoriesGetListQuery: jest.fn(),
        useLazyObjectsSimbadLookupQuery: jest.fn()
    }
}))

jest.mock('@/components/common', () => ({
    StarMap: () => <div data-testid={'star-map'} />,
    MarkdownEditor: ({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) => (
        <textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}))

const M51 = {
    simbadId: 'M 51',
    ra: 202.4696,
    dec: 47.1952,
    type: 'Sy2',
    majAxis: 9,
    minAxis: 7.8,
    magnitude: 8.36,
    aliases: ['M 51', 'NGC 5194']
}

const lookup = jest.fn()

// `simple-react-ui-kit` itself uses the project's shared Jest manual mock
// (`client/__mocks__/simple-react-ui-kit.tsx`) - its `Select` is a
// non-interactive stub (renders only the label, ignores `onSelect`/`value`),
// so `categories` can't be driven through a click here; it's seeded via
// `initialData` instead. See `ProfileCard.test.tsx`/`EventBookingForm.test.tsx`
// for the same `querySelector`/`getByDisplayValue` convention.
const defaultCategoriesState = {
    data: { items: [{ id: 1, title: 'Галактики' }] },
    isLoading: false
}

beforeEach(() => {
    jest.clearAllMocks()
    ;(API.useCategoriesGetListQuery as jest.Mock).mockReturnValue(defaultCategoriesState)
    lookup.mockResolvedValue({ data: M51 })
    ;(API.useLazyObjectsSimbadLookupQuery as jest.Mock).mockReturnValue([lookup, { isFetching: false }])
})

describe('AstroObjectForm', () => {
    it('blocks submit and shows every validation error when required fields are empty', async () => {
        const handleSubmit = jest.fn()
        render(<AstroObjectForm onSubmit={handleSubmit} />)

        fireEvent.click(screen.getByRole('button', { name: 'Добавить объект' }))

        await waitFor(() => {
            expect(screen.getByText('Выберите хотя бы одну категорию')).toBeDefined()
        })
        expect(screen.getByText('Введите имя объекта в каталогах')).toBeDefined()
        expect(screen.getByText('Введите название объекта')).toBeDefined()
        expect(screen.getByText('Введите значение RA')).toBeDefined()
        expect(screen.getByText('Введите значение DEC')).toBeDefined()
        expect(handleSubmit).not.toHaveBeenCalled()
    })

    it('submits the form once all required fields are valid', async () => {
        const handleSubmit = jest.fn()
        const { container } = render(
            <AstroObjectForm
                initialData={{ categories: [1] }}
                onSubmit={handleSubmit}
            />
        )

        fireEvent.change(container.querySelector('input[name="name"]') as HTMLInputElement, {
            target: { value: 'm31' }
        })
        fireEvent.change(container.querySelector('input[name="title"]') as HTMLInputElement, {
            target: { value: 'Андромеда' }
        })
        fireEvent.change(container.querySelector('input[name="ra"]') as HTMLInputElement, {
            target: { value: '10.5' }
        })
        fireEvent.change(container.querySelector('input[name="dec"]') as HTMLInputElement, {
            target: { value: '41.2' }
        })

        fireEvent.click(screen.getByRole('button', { name: 'Добавить объект' }))

        await waitFor(() => {
            expect(handleSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'm31',
                    title: 'Андромеда',
                    ra: 10.5,
                    dec: 41.2,
                    categories: [1]
                })
            )
        })
    })

    it('shows a validation error when RA is out of range', async () => {
        const { container } = render(<AstroObjectForm />)

        fireEvent.change(container.querySelector('input[name="ra"]') as HTMLInputElement, {
            target: { value: '999' }
        })

        fireEvent.click(screen.getByRole('button', { name: 'Добавить объект' }))

        await waitFor(() => {
            expect(screen.getByText('RA должно быть в диапазоне от 0 до 360')).toBeDefined()
        })
    })

    it('populates the form once initialData arrives', () => {
        render(
            <AstroObjectForm initialData={{ name: 'm31', title: 'Андромеда', ra: 10.5, dec: 41.2, categories: [1] }} />
        )

        expect(screen.getByDisplayValue('m31')).toBeDefined()
        expect(screen.getByDisplayValue('Андромеда')).toBeDefined()
    })

    it('reads the coordinates of an atlas: RA in hours, Dec in degrees and minutes', async () => {
        const handleSubmit = jest.fn()
        const { container } = render(
            <AstroObjectForm
                initialData={{ categories: [1] }}
                onSubmit={handleSubmit}
            />
        )

        fireEvent.change(container.querySelector('input[name="name"]') as HTMLInputElement, {
            target: { value: 'M_51' }
        })
        fireEvent.change(container.querySelector('input[name="title"]') as HTMLInputElement, {
            target: { value: 'Водоворот' }
        })
        fireEvent.change(container.querySelector('input[name="ra"]') as HTMLInputElement, {
            target: { value: '13:29:52.7' }
        })
        fireEvent.change(container.querySelector('input[name="dec"]') as HTMLInputElement, {
            target: { value: '+47° 11′ 43″' }
        })

        fireEvent.click(screen.getByRole('button', { name: 'Добавить объект' }))

        await waitFor(() => expect(handleSubmit).toHaveBeenCalled())

        const submitted = handleSubmit.mock.calls[0][0]
        expect(submitted.ra).toBeCloseTo(202.4696, 3)
        expect(submitted.dec).toBeCloseTo(47.1953, 3)
    })

    it('rejects a name with spaces: it is the name of the FITS frames', async () => {
        const { container } = render(<AstroObjectForm />)

        fireEvent.change(container.querySelector('input[name="name"]') as HTMLInputElement, {
            target: { value: 'M 51' }
        })
        fireEvent.click(screen.getByRole('button', { name: 'Добавить объект' }))

        expect(await screen.findByText('Вместо пробелов используйте подчёркивание: M_51')).toBeDefined()
    })

    it('keeps the name of an edited object read-only and shows a form-level server error', () => {
        const { container } = render(
            <AstroObjectForm
                initialData={{ name: 'M_51', title: 'Водоворот', ra: 202.47, dec: 47.19, categories: [1] }}
                error={{ message: 'Сервер недоступен' }}
            />
        )

        expect((container.querySelector('input[name="name"]') as HTMLInputElement).disabled).toBe(true)
        expect(screen.getByRole('button', { name: 'Сохранить изменения' })).toBeDefined()
        expect(screen.getByText('Сервер недоступен')).toBeDefined()
    })

    it('fills the empty coordinates and magnitude from SIMBAD and saves its facts with the form', async () => {
        const handleSubmit = jest.fn()
        const { container } = render(
            <AstroObjectForm
                initialData={{ categories: [1] }}
                onSubmit={handleSubmit}
            />
        )

        fireEvent.change(container.querySelector('input[name="name"]') as HTMLInputElement, {
            target: { value: 'M_51' }
        })
        fireEvent.change(container.querySelector('input[name="title"]') as HTMLInputElement, {
            target: { value: 'Водоворот' }
        })
        fireEvent.click(screen.getByRole('button', { name: 'Найти в SIMBAD' }))

        expect(await screen.findByText(/Подставлено/)).toBeDefined()
        expect(lookup).toHaveBeenCalledWith('M_51', true)
        expect((container.querySelector('input[name="ra"]') as HTMLInputElement).value).toBe('202.4696')

        fireEvent.click(screen.getByRole('button', { name: 'Добавить объект' }))

        await waitFor(() => expect(handleSubmit).toHaveBeenCalled())
        expect(handleSubmit.mock.calls[0][0]).toEqual(
            expect.objectContaining({ ra: 202.4696, dec: 47.1952, magnitude: 8.36, simbad: M51 })
        )
    })

    it('drops the SIMBAD facts when the name changes after the lookup', async () => {
        const handleSubmit = jest.fn()
        const { container } = render(
            <AstroObjectForm
                initialData={{ categories: [1] }}
                onSubmit={handleSubmit}
            />
        )
        const name = container.querySelector('input[name="name"]') as HTMLInputElement

        fireEvent.change(name, { target: { value: 'M_51' } })
        fireEvent.change(container.querySelector('input[name="title"]') as HTMLInputElement, {
            target: { value: 'Водоворот' }
        })
        fireEvent.click(screen.getByRole('button', { name: 'Найти в SIMBAD' }))
        expect(await screen.findByText(/Подставлено/)).toBeDefined()

        fireEvent.change(name, { target: { value: 'M_33' } })
        await waitFor(() => expect(screen.queryByText(/Подставлено/)).toBeNull())

        fireEvent.click(screen.getByRole('button', { name: 'Добавить объект' }))

        await waitFor(() => expect(handleSubmit).toHaveBeenCalled())
        expect(handleSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ name: 'M_33', simbad: null }))
    })

    it('offers SIMBAD coordinates when they differ from the typed ones instead of overwriting them', async () => {
        const { container } = render(
            <AstroObjectForm initialData={{ name: 'M_94', title: 'M 94', ra: 12.83, dec: 41.12, categories: [1] }} />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Найти в SIMBAD' }))

        expect(await screen.findByRole('button', { name: 'Взять координаты SIMBAD' })).toBeDefined()
        expect((container.querySelector('input[name="ra"]') as HTMLInputElement).value).toBe('12.83')

        fireEvent.click(screen.getByRole('button', { name: 'Взять координаты SIMBAD' }))

        await waitFor(() =>
            expect((container.querySelector('input[name="ra"]') as HTMLInputElement).value).toBe('202.4696')
        )
    })

    it('still sends the name of an edited object although its field is disabled', async () => {
        const handleSubmit = jest.fn()
        render(
            <AstroObjectForm
                initialData={{ name: 'M_51', title: 'Водоворот', ra: 202.47, dec: 47.19, categories: [1] }}
                onSubmit={handleSubmit}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }))

        await waitFor(() => expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'M_51' })))
    })

    it('surfaces a server-side field error returned for the name field', async () => {
        render(<AstroObjectForm error={{ message: 'Ошибка сохранения', errors: { name: 'Это имя уже занято' } }} />)

        expect(await screen.findByText('Это имя уже занято')).toBeDefined()
    })
})
