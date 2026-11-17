// Manual mock of `simple-react-ui-kit`, applied to every test automatically (a node module
// mock next to `node_modules`, no `jest.mock()` call needed).
//
// The stand-ins are plain, accessible HTML so tests query them the way a user sees them:
// every labelled control is wired to its label (`getByLabelText`), a field error is
// `role="alert"`, a single `Select` is a native `<select>` (`fireEvent.change`) and a
// `multiple` one a group of checkboxes (`fireEvent.click(getByLabelText(option))`).
// A test that needs a different stand-in overrides only that component:
// `jest.mock('simple-react-ui-kit', () => ({ ...jest.requireActual('@/__mocks__/simple-react-ui-kit'), X }))`.
import React, { useId } from 'react'

export const cn = (...args: unknown[]): string => args.filter(Boolean).join(' ')

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string
    loading?: boolean
    mode?: string
    variant?: string
    size?: string
    icon?: string
    stretched?: boolean
}

export const Button: React.FC<ButtonProps> = ({
    children,
    label,
    loading,
    mode: _mode,
    variant: _variant,
    size: _size,
    icon: _icon,
    stretched: _stretched,
    ...props
}) => <button {...props}>{loading ? 'Loading...' : (label ?? children)}</button>

const FieldError: React.FC<{ error?: string }> = ({ error }) => (error ? <span role={'alert'}>{error}</span> : null)

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string
    error?: string
    size?: string
}

export const Input: React.FC<InputProps> = ({ label, error, size: _size, ...props }) => {
    const id = useId()

    return (
        <div>
            {label && <label htmlFor={id}>{label}</label>}
            <input
                id={id}
                {...props}
            />
            <FieldError error={error} />
        </div>
    )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    autoResize?: boolean
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, autoResize: _autoResize, ...props }) => {
    const id = useId()

    return (
        <div>
            {label && <label htmlFor={id}>{label}</label>}
            <textarea
                id={id}
                {...props}
            />
            <FieldError error={error} />
        </div>
    )
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, ...props }) => (
    <label>
        <input
            type={'checkbox'}
            checked={checked ?? false}
            {...props}
        />
        {label}
    </label>
)

type SelectKey = string | number

interface SelectOption {
    key: SelectKey
    value: React.ReactNode
}

interface SelectProps {
    label?: string
    options?: SelectOption[]
    value?: SelectKey | SelectKey[]
    multiple?: boolean
    disabled?: boolean
    error?: string
    placeholder?: string
    onSelect?: (selected?: SelectOption[]) => void
}

export const Select: React.FC<SelectProps> = ({ label, options = [], value, multiple, disabled, error, onSelect }) => {
    const id = useId()

    if (multiple) {
        const selectedKeys = Array.isArray(value) ? value : value != null ? [value] : []

        const toggle = (key: SelectKey) => {
            const next = selectedKeys.includes(key)
                ? options.filter((option) => option.key !== key && selectedKeys.includes(option.key))
                : options.filter((option) => option.key === key || selectedKeys.includes(option.key))

            onSelect?.(next.length ? next : undefined)
        }

        return (
            <fieldset>
                {label && <legend>{label}</legend>}
                {options.map((option) => (
                    <label key={option.key}>
                        <input
                            type={'checkbox'}
                            checked={selectedKeys.includes(option.key)}
                            disabled={disabled}
                            onChange={() => toggle(option.key)}
                        />
                        {option.value}
                    </label>
                ))}
                <FieldError error={error} />
            </fieldset>
        )
    }

    return (
        <div>
            {label && <label htmlFor={id}>{label}</label>}
            <select
                id={id}
                disabled={disabled}
                value={value != null && !Array.isArray(value) ? String(value) : ''}
                onChange={(event) => {
                    const option = options.find(({ key }) => String(key) === event.target.value)
                    onSelect?.(option ? [option] : undefined)
                }}
            >
                <option value={''} />
                {options.map((option) => (
                    <option
                        key={option.key}
                        value={String(option.key)}
                    >
                        {option.value}
                    </option>
                ))}
            </select>
            <FieldError error={error} />
        </div>
    )
}

interface MessageProps {
    type?: string
    title?: string
    children?: React.ReactNode
}

export const Message: React.FC<MessageProps> = ({ title, children }) => (
    <div>
        {title && <strong>{title}</strong>}
        <span>{children}</span>
    </div>
)

interface ContainerProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
    title?: React.ReactNode
    header?: React.ReactNode
    action?: React.ReactNode
    footer?: React.ReactNode
}

export const Container: React.FC<ContainerProps> = ({ title, header, action, footer, children, ...props }) => (
    <section {...props}>
        {title && <h2>{title}</h2>}
        {header}
        {action}
        {children}
        {footer}
    </section>
)

interface DialogProps {
    title?: string
    open?: boolean
    onCloseDialog?: () => void
    children?: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ title, open, children }) =>
    open ? (
        <div role={'dialog'}>
            {title && <h2>{title}</h2>}
            {children}
        </div>
    ) : null

// Decorative in tests: renders no text, so it never collides with text queries
export const Icon: React.FC<{ name?: string; className?: string }> = ({ name }) => (
    <span
        aria-hidden={true}
        data-icon={name}
    />
)

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />

export const Spinner: React.FC = () => null

export const Calendar: React.FC<{ onDateSelect?: (date: string) => void }> = ({ onDateSelect }) => (
    <input
        aria-label={'calendar'}
        type={'text'}
        onChange={(e) => onDateSelect?.(e.target.value)}
    />
)

// Renders trigger and content unconditionally (no open/closed state) so tests can interact
// with whatever's inside (e.g. DateTimeInput's calendar) without a click-to-open first. Not
// given a forwardRef stand-in: callers that only use `ref.current?.close()` from inside
// their own popout content (DateTimeInput) get a harmless "cannot be given a ref" warning.
export const Popout: React.FC<{ trigger?: React.ReactNode; children?: React.ReactNode }> = ({ trigger, children }) => (
    <div>
        {trigger}
        <div>{children}</div>
    </div>
)
