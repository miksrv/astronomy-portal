import React from 'react'

export const cn = (...args: unknown[]): string => args.filter(Boolean).join(' ')

export const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        loading?: boolean
        mode?: string
        variant?: string
        label?: string
    }
> = ({ children, loading, mode: _mode, variant: _variant, label, ...props }) => (
    <button {...props}>{loading ? 'Loading...' : (label ?? children)}</button>
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

export const TextArea: React.FC<{
    rows?: number
    autoResize?: boolean
    disabled?: boolean
    value?: string
    maxLength?: number
    placeholder?: string
    error?: string
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement>
}> = ({ error, autoResize: _autoResize, ...props }) => (
    <div>
        <textarea {...props} />
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
    error?: string
    placeholder?: string
    className?: string
    onSelect?: (option: Array<{ key: string; value: string }>) => void
}> = ({ label, error }) => (
    <div>
        {label}
        {error && <span>{error}</span>}
    </div>
)

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

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />

export const Calendar: React.FC<{ onDateSelect?: (date: string) => void }> = ({ onDateSelect }) => (
    <input
        aria-label={'calendar'}
        type={'text'}
        onChange={(e) => onDateSelect?.(e.target.value)}
    />
)

// Renders trigger and content unconditionally (no open/closed state) so tests
// can interact with whatever's inside (e.g. DateTimeInput's calendar) without
// simulating a click-to-open first. Not given a forwardRef stand-in - callers
// that only use `ref.current?.close()` from inside their own popout content
// (see DateTimeInput) will get a harmless "cannot be given a ref" console
// warning, not a real defect.
export const Popout: React.FC<{ trigger?: React.ReactNode; children?: React.ReactNode }> = ({ trigger, children }) => (
    <div>
        {trigger}
        <div>{children}</div>
    </div>
)
