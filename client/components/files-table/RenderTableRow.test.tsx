import { TFIle, TFilterTypes } from '@/api/types'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import RenderTableRow from './RenderTableRow'

describe('RenderTableRow Component', () => {
    const mockOnPhotoClick = jest.fn()
    const sampleFile: TFIle = {
        ccd_temp: -10,
        date_obs: '2023-10-25T15:30:00Z',
        dec: 50,
        exptime: 120,
        file_name: 'sample-file.fits',
        filter: TFilterTypes.red,
        gain: 1.5,
        hfr: 2.5,
        id: '1',
        object: 'Object 1',
        offset: 0.8,
        preview: true,
        ra: 40,
        sky_background: 20,
        star_count: 100
    }

    it('renders table row with default props', () => {
        render(
            <RenderTableRow
                file={sampleFile}
                itemId={1}
                object={'SampleObject'}
                showPreview={true}
                onPhotoClick={mockOnPhotoClick}
            />
        )

        // Verify that the table cells are rendered
        const cells = screen.getAllByRole('cell')
        expect(cells).toHaveLength(8) // 8 cells when showAdditional is false and showPreview is true

        // Verify that the cell content is correctly displayed
        expect(screen.getByText('sample-file.fits')).toBeInTheDocument()
        expect(screen.getByText('120')).toBeInTheDocument()
        expect(screen.getByText('red')).toBeInTheDocument()
        expect(screen.getByText('-10')).toBeInTheDocument()
        expect(screen.getByText('1.5')).toBeInTheDocument()
        expect(screen.getByText('0.8')).toBeInTheDocument()
        expect(screen.getByText('25.10.2023, 20:30')).toBeInTheDocument()

        // Verify that the preview image is present and clickable
        const previewImage = screen.getByRole('img')
        expect(previewImage).toBeInTheDocument()
        fireEvent.click(previewImage)
        expect(mockOnPhotoClick).toHaveBeenCalledWith(1)
    })

    it('renders table row with additional fields', () => {
        render(
            <RenderTableRow
                file={sampleFile}
                itemId={2}
                object={'SampleObject'}
                showAdditional={true}
                onPhotoClick={mockOnPhotoClick}
            />
        )

        // Verify that the table cells are rendered
        const cells = screen.getAllByRole('cell')
        expect(cells).toHaveLength(10) // 10 cells when showAdditional is true (without preview)

        // Verify that the additional fields are rendered
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('20')).toBeInTheDocument()
        expect(screen.getByText('2.5')).toBeInTheDocument()
    })
})
