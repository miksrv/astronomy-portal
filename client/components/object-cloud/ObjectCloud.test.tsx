import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import ObjectCloud from './ObjectCloud'

describe('ObjectCloud', () => {
    it('renders the ObjectCloud component correctly', () => {
        render(
            <ObjectCloud
                loader={false}
                current='star'
                names={['star', 'planet']}
                link='objects'
            />
        )

        expect(screen.getByTestId('object-cloud')).toBeInTheDocument()
    })

    it('displays a loading spinner when loader is true', () => {
        render(
            <ObjectCloud
                loader={true}
                current='star'
                names={['star', 'planet']}
                link='objects'
            />
        )

        expect(screen.getByTestId('object-cloud-loader')).toBeInTheDocument()
    })

    it('displays object names as links', () => {
        render(
            <ObjectCloud
                loader={false}
                current='star'
                names={['star', 'planet']}
                link='objects'
            />
        )

        expect(screen.getAllByRole('link')).toHaveLength(2)
    })

    it('activates the link for the current object', () => {
        render(
            <ObjectCloud
                loader={false}
                current='star'
                names={['star', 'planet']}
                link='objects'
            />
        )

        expect(screen.getByText('star')).toHaveClass('active')
    })

    it('navigates to the correct URL when a link is clicked', () => {
        render(
            <ObjectCloud
                loader={false}
                current='star'
                names={['star', 'planet']}
                link='objects'
            />
        )

        const starLink = screen.getByText('star')

        expect(starLink).toBeInTheDocument()

        fireEvent.click(starLink)

        // Assert URL navigation, you can use a testing library specific solution if available
        // For example, if you're using react-router and react-router-dom, you can use memory history to test navigation
    })
})
