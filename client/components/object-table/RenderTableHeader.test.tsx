import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { TSortOrdering, TTableItem } from '@/components/object-table/types'

import RenderTableHeader, { HeaderFields } from './RenderTableHeader'

const mockHandlerSortClick = jest.fn()

const renderComponent = (sort: keyof TTableItem, order: TSortOrdering) => {
    render(
        <RenderTableHeader
            sort={sort}
            order={order}
            handlerSortClick={mockHandlerSortClick}
        />
    )
}

describe('RenderTableHeader', () => {
    it('renders table headers correctly', () => {
        renderComponent('name', 'ascending')

        HeaderFields.forEach((item) => {
            expect(screen.getByText(item.name)).toBeInTheDocument()
        })
    })

    it('handles sort click correctly', () => {
        renderComponent('name', 'ascending')

        fireEvent.click(screen.getByText('Фото'))

        expect(mockHandlerSortClick).toHaveBeenCalledWith('photo')
    })
})
