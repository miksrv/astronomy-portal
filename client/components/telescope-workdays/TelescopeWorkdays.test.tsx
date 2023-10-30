import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'

import TelescopeWorkdays from './TelescopeWorkdays'

describe('TelescopeWorkdays Component', () => {
    it('renders loading indicator when loading is true', () => {
        render(<TelescopeWorkdays loading={true} />)
        const loader = screen.getByTestId('telescope-workdays-loader')
        expect(loader).toBeInTheDocument()
    })

    it('renders the telescope workdays table with data when loading is false', () => {
        const eventsTelescope = [
            {
                catalog_items: ['object1', 'object2'],
                frames_count: 10,
                telescope_date: '2023-10-10',
                total_exposure: 600
            }
        ]

        render(
            <TelescopeWorkdays
                loading={false}
                eventsTelescope={eventsTelescope}
            />
        )

        const dateCell = screen.getByText('10 October 2023')
        expect(dateCell).toBeInTheDocument()

        const framesCountCell = screen.getByText('10')
        expect(framesCountCell).toBeInTheDocument()

        const exposureCell = screen.getByText('10 минут')
        expect(exposureCell).toBeInTheDocument()

        const linkObject1 = screen.getByText('object1')
        expect(linkObject1).toBeInTheDocument()

        const linkObject2 = screen.getByText('object2')
        expect(linkObject2).toBeInTheDocument()
    })
})
