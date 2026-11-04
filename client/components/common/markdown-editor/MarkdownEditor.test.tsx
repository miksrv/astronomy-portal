import React, { useState } from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { MarkdownEditor } from './MarkdownEditor'

jest.mock('react-markdown', () => ({
    __esModule: true,
    default: ({ children }: { children: string }) => <div data-testid={'markdown'}>{children}</div>
}))

jest.mock('@/components/ui', () => ({
    SegmentedControl: ({
        options,
        onChange
    }: {
        options: Array<{ key: string; label: string }>
        onChange: (key: string) => void
    }) => (
        <div>
            {options.map((option) => (
                <button
                    key={option.key}
                    type={'button'}
                    onClick={() => onChange(option.key)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}))

const Editor: React.FC<{ initial?: string }> = ({ initial = '' }) => {
    const [value, setValue] = useState(initial)

    return (
        <MarkdownEditor
            name={'description'}
            label={'Описание'}
            value={value}
            onChange={setValue}
        />
    )
}

describe('MarkdownEditor', () => {
    it('makes the selection bold from the toolbar', () => {
        const { container } = render(<Editor initial={'a bright galaxy'} />)
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement

        textarea.setSelectionRange(2, 8)
        fireEvent.click(screen.getByRole('button', { name: 'Жирный (⌘B)' }))

        expect(textarea.value).toBe('a **bright** galaxy')
    })

    it('makes a link with ⌘K', () => {
        const { container } = render(<Editor initial={'SIMBAD'} />)
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement

        textarea.setSelectionRange(0, 6)
        fireEvent.keyDown(textarea, { key: 'k', metaKey: true })

        expect(textarea.value).toBe('[SIMBAD](https://)')
    })

    it('shows the text as visitors will see it in the preview', () => {
        render(<Editor initial={'**M 51**'} />)

        fireEvent.click(screen.getByRole('button', { name: 'Просмотр' }))

        expect(screen.getByTestId('markdown').textContent).toBe('**M 51**')
    })
})
