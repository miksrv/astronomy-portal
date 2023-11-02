import { TPhoto } from '@/api/types'
import { render, screen } from '@testing-library/react'
import React from 'react'

import RenderTableRow from './RenderTableRow'

const mockPhoto: TPhoto = {
    date: '2023-10-26',
    filters: {
        hydrogen: {
            exposure: 890,
            frames: 36
        },
        luminance: {
            exposure: 567,
            frames: 24
        }
    },
    id: 1,
    image_ext: 'image_ext',
    image_height: 100,
    image_name: 'image_name',
    image_size: 200,
    image_width: 100,
    object: 'TestObject',
    statistic: {
        data_size: 125561,
        exposure: 1234,
        frames: 42
    }
}

describe('RenderTableRow', () => {
    it('renders photo data correctly', () => {
        render(<RenderTableRow photo={mockPhoto} />)

        const objectLink = screen.getByRole('link', {
            name: 'Другой вариант фотографии объекта TestObject'
        })
        expect(objectLink).toBeInTheDocument()
        expect(objectLink).toHaveAttribute(
            'href',
            `/photos/${mockPhoto.object}?date=${mockPhoto.date}`
        )
        expect(objectLink).toHaveAttribute(
            'title',
            `Перейти к другой фотографии объекта ${mockPhoto.object}`
        )

        const dateCell = screen.getByText('26.10.2023')
        expect(dateCell).toBeInTheDocument()

        const framesCell = screen.getByText('42')
        expect(framesCell).toBeInTheDocument()

        const exposureCell = screen.getByText('20 минут')
        expect(exposureCell).toBeInTheDocument()

        const filter1Cell = screen.getByText('00:09')
        expect(filter1Cell).toBeInTheDocument()

        const filter2Cell = screen.getByText('00:14')
        expect(filter2Cell).toBeInTheDocument()
    })

    it('does not render specific filter data on mobile when hideRows prop is set', () => {
        render(
            <RenderTableRow
                photo={mockPhoto}
                hideRows={['filter1']}
            />
        )
        const filter1Cell = screen.queryByText('9 минут 27 сек.')
        expect(filter1Cell).not.toBeInTheDocument()
    })

    it('renders specific filter data on desktop when hideRows prop is set', () => {
        render(
            <RenderTableRow
                photo={mockPhoto}
                hideRows={['filter1']}
            />
        )
        const filter2Cell = screen.getByText('00:14')
        expect(filter2Cell).toBeInTheDocument()
    })
})
