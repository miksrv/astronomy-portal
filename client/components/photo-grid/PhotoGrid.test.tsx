import { TCatalog, TPhoto } from '@/api/types'
import { renderWithStore } from '@/setupTests.config'
import { render, screen, waitFor } from '@testing-library/react'

import PhotoGrid, { PhotoImage } from './PhotoGrid'

const customInitialState = {
    auth: {
        isAuth: true
    }
}

jest.mock('@/api/constants', () => ({
    hosts: {
        photo: 'https://example.com/photos/'
    }
}))

jest.mock('@/functions/helpers', () => ({
    range: jest.fn((start, end) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i)
    ),
    sliceText: jest.fn((text) => text.slice(0, 10))
}))

const mockCatalog: TCatalog[] = [
    {
        category: 1,
        coord_dec: 3,
        coord_ra: 2,
        filters: {},
        name: 'object1',
        statistic: {
            data_size: 33,
            exposure: 44,
            frames: 22
        },
        text: 'Description 1',
        title: 'Object 1',
        updated: '2023-01-01'
    },
    {
        category: 1,
        coord_dec: 3,
        coord_ra: 2,
        filters: {},
        name: 'object2',
        statistic: {
            data_size: 33,
            exposure: 44,
            frames: 22
        },
        text: 'Description 2',
        title: 'Object 2',
        updated: '2023-01-01'
    }
]

const mockPhotos: TPhoto[] = [
    {
        date: '2023-01-01',
        filters: {},
        id: 1,
        image_ext: 'jpg',
        image_height: 3,
        image_name: 'image1',
        image_size: 1,
        image_width: 2,
        object: 'object1',
        statistic: {
            data_size: 33,
            exposure: 44,
            frames: 22
        }
    },
    {
        date: '2023-01-02',
        filters: {},
        id: 2,
        image_ext: 'png',
        image_height: 3,
        image_name: 'image2',
        image_size: 1,
        image_width: 2,
        object: 'object2',
        statistic: {
            data_size: 33,
            exposure: 44,
            frames: 22
        }
    }
]

describe('PhotoGrid', () => {
    it('renders PhotoGrid component with photos and catalog', async () => {
        renderWithStore(
            <PhotoGrid
                photos={mockPhotos}
                catalog={mockCatalog}
            />,
            customInitialState
        )

        expect(
            screen.getByAltText('Object 1 Фотография объекта')
        ).toBeInTheDocument()
        expect(
            screen.getByAltText('Object 2 Фотография объекта')
        ).toBeInTheDocument()
    })

    it('renders not found message when no photos are present', async () => {
        renderWithStore(<PhotoGrid />, customInitialState)
        await waitFor(() => {
            expect(
                screen.getByText(
                    'Фотографий объектов по выбранной категории не найдено'
                )
            ).toBeInTheDocument()
        })
    })
})

describe('PhotoImage Component', () => {
    it('renders PhotoImage component with correct image source', () => {
        render(
            <PhotoImage
                photo={mockPhotos[0]}
                title='Object 1'
            />
        )
        const image = screen.getByAltText('Object 1 Фотография объекта')
        expect(image).toBeInTheDocument()
    })
})
