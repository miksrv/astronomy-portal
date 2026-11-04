import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'

import { AstroObjectForm } from './AstroObjectForm'

jest.mock('@/api', () => ({
    API: {
        useCategoriesGetListQuery: jest.fn()
    }
}))

// The stub "finds" M 31 (magnitude 3.4) on a click
jest.mock('@/components/common', () => ({
    CatalogSearch: ({ onSelect }: { onSelect: (item: unknown) => void }) => (
        <button
            type={'button'}
            onClick={() => onSelect({ ra: 10.68, dec: 41.27, magnitude: 3.4 })}
        >
            {'catalog-pick'}
        </button>
    ),
    StarMap: () => <div data-testid={'star-map'} />
}))

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
})

describe('AstroObjectForm', () => {
    it('blocks submit and shows every validation error when required fields are empty', async () => {
        const handleSubmit = jest.fn()
        render(<AstroObjectForm onSubmit={handleSubmit} />)

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

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

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

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

        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

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

    it('surfaces a server-side field error returned for the name field', async () => {
        render(<AstroObjectForm error={{ message: 'Ошибка сохранения', errors: { name: 'Это имя уже занято' } }} />)

        expect(await screen.findByText('Это имя уже занято')).toBeDefined()
    })

    it('fills the position and an empty magnitude from a catalog pick', async () => {
        render(<AstroObjectForm />)

        fireEvent.click(screen.getByText('catalog-pick'))

        await waitFor(() => {
            expect(screen.getByDisplayValue('10.68')).toBeDefined()
        })
        expect(screen.getByDisplayValue('41.27')).toBeDefined()
        expect(screen.getByDisplayValue('3.4')).toBeDefined()
    })

    it('keeps the magnitude an editor already entered', async () => {
        render(<AstroObjectForm initialData={{ magnitude: 5 }} />)

        fireEvent.click(screen.getByText('catalog-pick'))

        await waitFor(() => {
            expect(screen.getByDisplayValue('10.68')).toBeDefined()
        })
        expect(screen.getByDisplayValue('5')).toBeDefined()
        expect(screen.queryByDisplayValue('3.4')).toBeNull()
    })
})
