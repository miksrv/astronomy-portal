import React from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'

import { API } from '@/api'

import { CatalogSearch } from './CatalogSearch'

jest.mock('@/api', () => ({
    API: { useCatalogSearchQuery: jest.fn() },
    ApiModel: {}
}))

const item = {
    id: 1,
    name: 'NGC0224',
    designation: 'NGC224',
    messier: 31,
    type: 'G',
    ra: 10.68,
    dec: 41.27,
    constellation: 'And',
    majAxis: 177,
    minAxis: 69,
    posAngle: 35,
    magnitude: 3.44,
    surfBrightness: null,
    hubble: 'Sb',
    commonNames: ['Andromeda Galaxy'],
    nameRu: null,
    objectName: null
}

const search = jest.fn()

beforeEach(() => {
    jest.useFakeTimers()
    search.mockReset()
    ;(API.useCatalogSearchQuery as jest.Mock).mockImplementation((args, options) => {
        search(args, options)

        return { currentData: options?.skip ? undefined : { items: [item] }, isFetching: false, isError: false }
    })
})

afterEach(() => {
    jest.useRealTimers()
})

const type = (value: string) => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value } })

    act(() => {
        jest.advanceTimersByTime(300)
    })
}

describe('CatalogSearch', () => {
    it('does not ask the API for a single character', () => {
        render(<CatalogSearch onSelect={jest.fn()} />)

        type('m')

        expect(search).toHaveBeenLastCalledWith({ q: 'm', limit: 10 }, { skip: true })
    })

    it('waits out the debounce before searching', () => {
        render(<CatalogSearch onSelect={jest.fn()} />)

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'M31' } })

        expect(search).not.toHaveBeenCalledWith({ q: 'M31', limit: 10 }, { skip: false })

        act(() => {
            jest.advanceTimersByTime(300)
        })

        expect(search).toHaveBeenLastCalledWith({ q: 'M31', limit: 10 }, { skip: false })
    })

    it('shows the designations, the common name, the type and the magnitude', () => {
        render(<CatalogSearch onSelect={jest.fn()} />)

        type('M31')

        expect(screen.getByRole('option')).toHaveTextContent('M 31 · NGC 224')
        expect(screen.getByRole('option')).toHaveTextContent('Andromeda Galaxy')
        expect(screen.getByRole('option')).toHaveTextContent('Галактика')
        expect(screen.getByRole('option')).toHaveTextContent('3.4ᵐ')
    })

    it('picks with the keyboard and clears the field', () => {
        const onSelect = jest.fn()

        render(<CatalogSearch onSelect={onSelect} />)

        type('M31')

        const input = screen.getByRole('combobox')

        fireEvent.keyDown(input, { key: 'ArrowDown' })
        fireEvent.keyDown(input, { key: 'Enter' })

        expect(onSelect).toHaveBeenCalledWith(item)
        expect(input).toHaveValue('')
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('picks with a click', () => {
        const onSelect = jest.fn()

        render(<CatalogSearch onSelect={onSelect} />)

        type('M31')
        fireEvent.click(screen.getByRole('option'))

        expect(onSelect).toHaveBeenCalledWith(item)
    })

    it('closes on Escape', () => {
        render(<CatalogSearch onSelect={jest.fn()} />)

        type('M31')
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('says so when nothing is found', () => {
        ;(API.useCatalogSearchQuery as jest.Mock).mockReturnValue({
            currentData: { items: [] },
            isFetching: false,
            isError: false
        })

        render(<CatalogSearch onSelect={jest.fn()} />)

        type('zzzz')

        expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
    })
})
