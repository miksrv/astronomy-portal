import React from 'react'

export const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        loading?: boolean
        mode?: string
        variant?: string
    }
> = ({ children, loading, mode: _mode, variant: _variant, ...props }) => (
    <button {...props}>{loading ? 'Loading...' : children}</button>
)

export const Input: React.FC<{
    label?: string
    name?: string
    placeholder?: string
    value?: string
    error?: string
    required?: boolean
    className?: string
    onChange?: React.ChangeEventHandler<HTMLInputElement>
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}> = ({ label, error, ...props }) => (
    <div>
        {label && <label>{label}</label>}
        <input {...props} />
        {error && <span>{error}</span>}
    </div>
)

export const Message: React.FC<{
    type?: string
    title?: string
    children?: React.ReactNode
}> = ({ title, children }) => (
    <div>
        {title && <strong>{title}</strong>}
        <span>{children}</span>
    </div>
)

export const Select: React.FC<{
    label?: string
    options?: Array<{ key: string; value: string }>
    value?: string
    placeholder?: string
    className?: string
    onSelect?: (option: Array<{ key: string; value: string }>) => void
}> = ({ label }) => <div>{label}</div>

export const Container: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
    <div {...props}>{children}</div>
)

export const Dialog: React.FC<{
    title?: string
    open?: boolean
    onCloseDialog?: () => void
    children?: React.ReactNode
}> = ({ title, open, children }) =>
    open ? (
        <div>
            {title && <h2>{title}</h2>}
            {children}
        </div>
    ) : null

export const Icon: React.FC<{ name?: string; className?: string }> = ({ name }) => <span>{name}</span>
