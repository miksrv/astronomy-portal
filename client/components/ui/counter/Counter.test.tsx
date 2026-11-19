import React from 'react'

import { render, screen } from '@testing-library/react'

import { Counter } from './Counter'

describe('Counter', () => {
    const observe = jest.fn()

    beforeEach(() => {
        observe.mockClear()
        window.IntersectionObserver = jest.fn(() => ({
            observe,
            disconnect: jest.fn(),
            unobserve: jest.fn(),
            takeRecords: jest.fn(),
            root: null,
            rootMargin: '',
            thresholds: []
        })) as unknown as typeof IntersectionObserver
    })

    it('shows the real number on screen, without counting from 0', () => {
        // jsdom lays nothing out: every rect is 0×0 at the top, i.e. inside the viewport
        render(<Counter end={1611} />)

        expect(screen.getByText('1611')).toBeInTheDocument()
        expect(observe).not.toHaveBeenCalled()
    })

    it('follows a value that arrives after the first paint', () => {
        const { rerender } = render(<Counter end={0} />)

        rerender(<Counter end={42} />)

        expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('resets a counter below the fold to 0 and waits for it to scroll in', () => {
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            top: window.innerHeight + 500,
            bottom: window.innerHeight + 540
        } as DOMRect)

        render(<Counter end={1611} />)

        expect(screen.getByText('0')).toBeInTheDocument()
        expect(observe).toHaveBeenCalledTimes(1)

        jest.restoreAllMocks()
    })
})
