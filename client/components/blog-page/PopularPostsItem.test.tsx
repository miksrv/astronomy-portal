import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'

import PopularPostItem from './PopularPostItem'

describe('PopularPostItem', () => {
    it('should render an image when media is provided', () => {
        const media = [
            {
                file: 'sample-image.jpg',
                file_type: 'image/jpeg',
                height: 10,
                width: 20
            }
        ]

        render(<PopularPostItem media={media} />)
        expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('should render text when provided', () => {
        const text = 'Sample text content'
        render(<PopularPostItem text={text} />)
        expect(screen.getByText(text)).toBeInTheDocument()
    })

    it('should render the correct alt text for the image', () => {
        const media = [
            {
                file: 'sample-image.jpg',
                file_type: 'image/jpeg',
                height: 10,
                width: 20
            }
        ]

        const altText = 'Sample alt text'

        render(
            <PopularPostItem
                media={media}
                text={altText}
            />
        )

        expect(screen.getByRole('img')).toHaveAttribute('alt', altText)
    })
})
