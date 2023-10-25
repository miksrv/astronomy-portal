import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'

import PopularPosts from './PopularPosts'

describe('PopularPosts', () => {
    it('should display the "Популярное в блоге" title', () => {
        render(<PopularPosts />)
        expect(screen.getByText('Популярное в блоге')).toBeInTheDocument()
    })

    it('should display the "за 30 дней" subtitle', () => {
        render(<PopularPosts />)
        expect(screen.getByText('за 30 дней')).toBeInTheDocument()
    })

    it('should display a loading spinner when loading is true', () => {
        render(<PopularPosts loading={true} />)
        expect(screen.getByTestId('popular-loader')).toBeInTheDocument()
    })

    it('should display a placeholder for posts when loading is true', () => {
        render(<PopularPosts loading={true} />)
        expect(screen.getAllByRole('img')).toHaveLength(4) // Assuming 4 is the placeholder count
    })

    it('should display popular post items when posts are provided', () => {
        const posts = [
            {
                group_id: 1,
                id: 1,
                telegram_date: 0,
                telegram_id: 1,
                text: 'Sample text 1'
            },
            {
                group_id: 2,
                id: 2,
                telegram_date: 0,
                telegram_id: 2,
                text: 'Sample text 2'
            }
        ]

        render(<PopularPosts posts={posts} />)

        posts.forEach((post) => {
            expect(screen.getByText(post.text)).toBeInTheDocument()
        })
    })
})
