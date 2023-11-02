import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import Camera from './Camera'

describe('Camera', () => {
    const cameraURL = 'https://example.com/camera.jpg'

    it('renders the camera section correctly', () => {
        render(<Camera cameraURL={cameraURL} />)
        const cameraSection = screen.getByTestId('camera-section')
        expect(cameraSection).toBeInTheDocument()
    })

    it('displays the camera image', () => {
        render(<Camera cameraURL={cameraURL} />)
        const cameraImage = screen.getByAltText(
            'Изображение с камеры обсерватории'
        )
        expect(cameraImage).toBeInTheDocument()
    })

    it('opens the lightbox when the camera image is clicked', () => {
        render(<Camera cameraURL={cameraURL} />)
        const cameraImage = screen.getByAltText(
            'Изображение с камеры обсерватории'
        )
        fireEvent.click(cameraImage)

        expect(screen.getByLabelText('Lightbox')).toBeInTheDocument()
    })

    it('displays the loading message when the cameraURL is not provided', () => {
        render(<Camera />)
        const loadingMessage = screen.getByText('Камера не доступна')
        expect(loadingMessage).toBeInTheDocument()
    })

    it('increments the progress bar correctly', () => {
        render(
            <Camera
                cameraURL={cameraURL}
                interval={5}
            />
        )
        const progressBar = screen.getByTestId('progress-bar')
        fireEvent.click(progressBar) // Simulate the passage of 1 second
        const updatedProgressBar = screen.getByTestId('progress-bar')
        expect(progressBar).toBe(updatedProgressBar)
    })

    it('increments the progress bar until it reaches 100%', () => {
        render(
            <Camera
                cameraURL={cameraURL}
                interval={5}
            />
        )
        const progressBar = screen.getByTestId('progress-bar')
        for (let i = 0; i < 5; i++) {
            fireEvent.click(progressBar) // Simulate the passage of 1 second five times
        }
        const updatedProgressBar = screen.getByTestId('progress-bar')
        expect(updatedProgressBar).not.toHaveAttribute('percent', '100')
    })

    it('resets the progress bar after the timeout interval', () => {
        render(
            <Camera
                cameraURL={cameraURL}
                interval={2}
            />
        )
        const progressBar = screen.getByTestId('progress-bar')
        for (let i = 0; i < 2; i++) {
            fireEvent.click(progressBar) // Simulate the passage of 1 second twice
        }
        const updatedProgressBar = screen.getByTestId('progress-bar')
        expect(updatedProgressBar).not.toHaveAttribute('percent', '100')
    })
})
