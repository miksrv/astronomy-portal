import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import RenderTableHeader, { HEADER_FIELDS } from './RenderTableHeader'

describe('RenderTableHeader Component', () => {
    const mockHandlerSortClick = jest.fn()
    const defaultSort = 'file_name'
    const defaultOrder = 'ascending'

    it('renders table headers with default props', () => {
        render(
            <RenderTableHeader
                sort={defaultSort}
                order={defaultOrder}
                showPreview={true}
                showAdditional={true}
            />
        )

        // Verify that the header cells are rendered
        const headerCells = screen.getAllByRole('columnheader')
        expect(headerCells).toHaveLength(HEADER_FIELDS.length)

        // Verify the default sorting is set on the 'file_name' column
        const fileNameHeader = screen.getByText('Имя файла')
        expect(fileNameHeader).toHaveAttribute('aria-sort', defaultOrder)
    })

    it('calls handlerSortClick when a header cell is clicked', () => {
        render(
            <RenderTableHeader
                sort={defaultSort}
                order={defaultOrder}
                handlerSortClick={mockHandlerSortClick}
            />
        )

        // Simulate a click on the 'exptime' header cell
        const exptimeHeader = screen.getByText('Выдержка')
        fireEvent.click(exptimeHeader)

        // Verify that handlerSortClick is called with the correct argument
        expect(mockHandlerSortClick).toHaveBeenCalledWith('exptime')
    })
})
