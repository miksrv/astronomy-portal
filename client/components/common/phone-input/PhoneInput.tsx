import React from 'react'
import { Input, InputProps } from 'simple-react-ui-kit'

// Allows only characters that can legitimately appear in a phone number:
// digits, a leading '+', spaces, hyphens and parentheses.
const INVALID_CHARS_REGEX = /[^\d+\-()\s]/g

// Long enough for any real phone number (incl. extensions/formatting), short
// enough to stop someone pasting an arbitrary string into the field.
const DEFAULT_MAX_LENGTH = 20

const sanitizePhoneValue = (value: string, maxLength: number): string => {
    const withoutInvalidChars = value.replace(INVALID_CHARS_REGEX, '')
    const leadingPlus = withoutInvalidChars.startsWith('+') ? '+' : ''

    return (leadingPlus + withoutInvalidChars.replace(/\+/g, '')).slice(0, maxLength)
}

export const PhoneInput: React.FC<InputProps> = ({ onChange, maxLength = DEFAULT_MAX_LENGTH, ...rest }) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.target.value = sanitizePhoneValue(event.target.value, maxLength)
        onChange?.(event)
    }

    return (
        <Input
            {...rest}
            type={'tel'}
            inputMode={'tel'}
            autoComplete={'tel'}
            maxLength={maxLength}
            onChange={handleChange}
        />
    )
}
