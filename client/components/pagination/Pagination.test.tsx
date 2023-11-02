import { render, screen } from '@testing-library/react'
import React from 'react'

import Pagination from './Pagination'

describe('Pagination', () => {
    it('should display a basic pagination component', () => {
        render(
            <Pagination
                currentPage={1}
                totalPostCount={10}
                linkPart='posts'
                perPage={4}
                neighbours={2}
            />
        )

        // Check that the pagination component is rendered
        const pagination = screen.getByLabelText('Pages Pagination')
        expect(pagination).toBeInTheDocument()

        // Check that the links for pages are displayed correctly
        const page1 = screen.getByText('1')
        const page2 = screen.getByText('2')
        const page3 = screen.getByText('3')

        expect(page1).toBeInTheDocument()
        expect(page2).toBeInTheDocument()
        expect(page3).toBeInTheDocument()
    })

    it('should display active page correctly', () => {
        render(
            <Pagination
                currentPage={2}
                totalPostCount={10}
                linkPart={'posts'}
                perPage={4}
                neighbours={2}
            />
        )

        // Check that the current page is displayed as active
        const page2 = screen.getByText('2')
        expect(page2).toHaveClass('active')
    })

    it('should display ellipsis for many pages', () => {
        render(
            <Pagination
                currentPage={5}
                totalPostCount={50}
                linkPart={'posts'}
                perPage={4}
                neighbours={2}
            />
        )

        // Check that ellipsis links are displayed
        const leftEllipsis = screen.getByTitle('Следующая страница')
        const rightEllipsis = screen.getByTitle('Предыдущая страница')

        expect(leftEllipsis).toBeInTheDocument()
        expect(rightEllipsis).toBeInTheDocument()
    })
})
