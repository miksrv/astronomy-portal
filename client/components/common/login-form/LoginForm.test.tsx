import React from 'react'

import { useRouter } from 'next/router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { API } from '@/api'

import { LoginForm } from './LoginForm'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))

jest.mock('@/api', () => ({
    API: {
        useAuthLoginServiceMutation: jest.fn(),
        useAuthRequestMagicLinkMutation: jest.fn()
    }
}))

const mockLoginService = jest.fn()
const mockRequestMagicLink = jest.fn()

const defaultMutationState = {
    data: undefined,
    error: undefined,
    isLoading: false,
    isError: false
}

beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({ asPath: '/stargazing' })
    ;(API.useAuthLoginServiceMutation as jest.Mock).mockReturnValue([mockLoginService, defaultMutationState])
    ;(API.useAuthRequestMagicLinkMutation as jest.Mock).mockReturnValue([mockRequestMagicLink, defaultMutationState])
})

describe('LoginForm', () => {
    it('disables the submit button while the email field is empty', () => {
        render(<LoginForm />)

        expect(screen.getByRole('button', { name: 'Войти' })).toBeDisabled()
    })

    it('shows a validation error and keeps the submit button disabled for an invalid email', async () => {
        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Ваш email'), { target: { value: 'not-an-email' } })

        await waitFor(() => {
            expect(screen.getByText('Введите корректный email')).toBeDefined()
        })

        expect(screen.getByRole('button', { name: 'Войти' })).toBeDisabled()
        expect(mockRequestMagicLink).not.toHaveBeenCalled()
    })

    it('submits the trimmed email once it is valid', async () => {
        mockRequestMagicLink.mockResolvedValue({})
        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Ваш email'), { target: { value: '  user@example.com  ' } })

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Войти' })).not.toBeDisabled()
        })

        fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

        await waitFor(() => {
            expect(mockRequestMagicLink).toHaveBeenCalledWith({
                email: 'user@example.com',
                returnPath: '/stargazing'
            })
        })
    })

    it('surfaces a server-side field error returned for the email field', async () => {
        ;(API.useAuthRequestMagicLinkMutation as jest.Mock).mockReturnValue([
            mockRequestMagicLink,
            {
                ...defaultMutationState,
                isError: true,
                error: { message: 'Ошибка отправки письма', errors: { email: 'Этот email уже используется' } }
            }
        ])

        render(<LoginForm />)

        expect(await screen.findByText('Ошибка отправки письма')).toBeDefined()
        expect(await screen.findByText('Этот email уже используется')).toBeDefined()
    })

    it('shows a confirmation message once the magic link has been sent', () => {
        ;(API.useAuthRequestMagicLinkMutation as jest.Mock).mockReturnValue([
            mockRequestMagicLink,
            { ...defaultMutationState, data: { sent: true } }
        ])

        render(<LoginForm />)

        expect(screen.getByText(/Письмо со ссылкой для входа отправлено/)).toBeDefined()
    })
})
