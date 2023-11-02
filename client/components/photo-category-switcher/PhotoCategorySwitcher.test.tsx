import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import PhotoCategorySwitcher from './PhotoCategorySwitcher'

const categories = [
    { id: 1, name: 'Category 1', object_count: 3 },
    { id: 2, name: 'Category 2', object_count: 0 },
    { id: 3, name: 'Category 3', object_count: 2 }
]

describe('PhotoCategorySwitcher', () => {
    it('renders category buttons with "Все объекты"', () => {
        const onSelectCategory = jest.fn()
        const activeCategory = 0

        render(
            <PhotoCategorySwitcher
                active={activeCategory}
                categories={categories}
                onSelectCategory={onSelectCategory}
            />
        )

        const allObjectsButton = screen.getByText('Все объекты')
        expect(allObjectsButton).toBeInTheDocument()
        expect(allObjectsButton).toHaveAttribute(
            'class',
            'ui orange mini button'
        )

        fireEvent.click(allObjectsButton)
        expect(onSelectCategory).toHaveBeenCalledWith(0)
    })

    it('renders category buttons with actual category names', () => {
        const onSelectCategory = jest.fn()
        const activeCategory = 2

        render(
            <PhotoCategorySwitcher
                active={activeCategory}
                categories={categories}
                onSelectCategory={onSelectCategory}
            />
        )

        const category1Button = screen.getByText('Category 1')
        expect(category1Button).toBeInTheDocument()
        expect(category1Button).toHaveAttribute(
            'class',
            'ui yellow mini button'
        )

        const category3Button = screen.getByText('Category 3')
        expect(category3Button).toBeInTheDocument()
        expect(category3Button).toHaveAttribute(
            'class',
            'ui yellow mini button'
        )

        fireEvent.click(category1Button)
        expect(onSelectCategory).toHaveBeenCalledWith(1)

        fireEvent.click(category3Button)
        expect(onSelectCategory).toHaveBeenCalledWith(3)
    })
})
