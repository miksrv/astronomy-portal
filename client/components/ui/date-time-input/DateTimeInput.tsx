import React, { useRef } from 'react'
import dayjs from 'dayjs'
import { Button, Calendar, Icon, Popout, Select } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export interface DateTimeInputProps {
    /** Label text displayed above the field, same convention as `Input`/`Select`. */
    label?: string
    /** Current value - `"YYYY-MM-DD"` in `mode="date"`, a `datetime-local`-compatible
     * `"YYYY-MM-DDTHH:mm"` in `mode="datetime"`. */
    value?: string
    /** `'datetime'` (default) shows the calendar plus hour/minute selects; `'date'` is
     * calendar-only and commits as soon as a day is picked. */
    mode?: 'date' | 'datetime'
    /** Marks the field as required (adds a visual asterisk, matches `Input`). */
    required?: boolean
    /** Disables the trigger and every control inside the popout. */
    disabled?: boolean
    /** Error message shown below the field instead of `hint`. A bare `true` only
     * marks the field as invalid (border) without rendering any text, e.g. for a
     * field validated as part of a group where the message is shown once elsewhere. */
    error?: string | boolean
    /** Helper text shown below the field when there is no `error`. */
    hint?: string
    /** Caption shown on the trigger when no value is selected (default depends on `mode`). */
    placeholder?: string
    /** Earliest selectable date ("YYYY-MM-DD"), forwarded to the calendar. */
    minDate?: string
    /** Latest selectable date ("YYYY-MM-DD"), forwarded to the calendar. */
    maxDate?: string
    /** Locale for month/day names in the calendar (default: 'ru'). */
    locale?: 'ru' | 'en'
    /** Additional class name for the outer wrapper. */
    className?: string
    /** Stable prefix for `data-testid` hooks on the trigger/calendar/time controls. */
    testId?: string
    onChange?: (value: string) => void
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
    const value = String(hour).padStart(2, '0')
    return { key: value, value }
})

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => {
    const value = String(minute).padStart(2, '0')
    return { key: value, value }
})

/**
 * Custom date (+ optional time) input used instead of a native `<input type="date">`/
 * `<input type="datetime-local">` — browser-native pickers render inconsistently across
 * browsers/OSes and are awkward on mobile. Combines the kit's own `Calendar` (date grid)
 * with, in `mode="datetime"`, two `Select` dropdowns (hour/minute) inside a `Popout`.
 *
 * `mode="datetime"` (default) produces the same "YYYY-MM-DDTHH:mm" string a
 * `datetime-local` input would, so it's a drop-in replacement for existing form state.
 * `mode="date"` produces a plain "YYYY-MM-DD" string and skips the time controls
 * entirely - picking a day commits immediately and closes the popout, since (unlike a
 * date+time value) a single day is already a complete value with no separate "Done" step.
 */
export const DateTimeInput: React.FC<DateTimeInputProps> = ({
    label,
    value,
    mode = 'datetime',
    required,
    disabled,
    error,
    hint,
    placeholder,
    minDate,
    maxDate,
    locale = 'ru',
    className,
    testId,
    onChange
}) => {
    // Typed structurally (rather than importing `PopoutHandleProps`) so this
    // file only needs one import statement from 'simple-react-ui-kit' — a
    // mix of a value and a type-only import from the same module trips up
    // this project's import-sort/no-duplicate-imports combination.
    const popoutRef = useRef<{ close: () => void }>(null)

    // `error` can be a message string (border + text below) or a bare `true`
    // (border only, e.g. for a field validated as part of a group where the
    // message is shown once elsewhere) — only a non-empty string renders the text.
    const errorMessage = typeof error === 'string' ? error : undefined
    const hasError = errorMessage ? errorMessage.length > 0 : !!error

    const showTime = mode === 'datetime'

    const parsed = value ? dayjs(value) : undefined
    const isValid = !!parsed && parsed.isValid()

    const datePart = isValid ? parsed!.format('YYYY-MM-DD') : undefined
    const hourPart = isValid ? parsed!.format('HH') : undefined
    const minutePart = isValid ? parsed!.format('mm') : undefined

    const commit = (nextDate?: string, nextHour?: string, nextMinute?: string) => {
        if (!nextDate) {
            return
        }

        onChange?.(showTime ? `${nextDate}T${nextHour ?? '00'}:${nextMinute ?? '00'}` : nextDate)
    }

    const resolvedPlaceholder = placeholder ?? (showTime ? 'Выберите дату и время' : 'Выберите дату')

    return (
        <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
            {label && (
                <span className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </span>
            )}

            <Popout
                ref={popoutRef}
                disabled={disabled}
                position={'left'}
                className={styles.popout}
                trigger={
                    <button
                        type={'button'}
                        data-testid={testId && `${testId}-trigger`}
                        className={[styles.trigger, hasError && styles.triggerError].filter(Boolean).join(' ')}
                        disabled={disabled}
                    >
                        <Icon
                            name={'Calendar'}
                            className={styles.triggerIcon}
                        />
                        <span className={isValid ? styles.triggerValue : styles.triggerPlaceholder}>
                            {isValid
                                ? parsed!.format(showTime ? 'DD.MM.YYYY, HH:mm' : 'DD.MM.YYYY')
                                : resolvedPlaceholder}
                        </span>
                    </button>
                }
            >
                <div className={styles.panel}>
                    <div data-testid={testId && `${testId}-calendar`}>
                        <Calendar
                            locale={locale}
                            highlightToday={true}
                            minDate={minDate}
                            maxDate={maxDate}
                            datePeriod={[datePart, datePart]}
                            onDateSelect={(date) => {
                                commit(date, hourPart, minutePart)

                                if (!showTime) {
                                    popoutRef.current?.close()
                                }
                            }}
                        />
                    </div>

                    {showTime && (
                        <>
                            <div className={styles.timeRow}>
                                <div
                                    className={styles.timeSelect}
                                    data-testid={testId && `${testId}-hour`}
                                >
                                    <Select<string>
                                        label={'Часы'}
                                        disabled={!datePart}
                                        options={HOUR_OPTIONS}
                                        value={hourPart}
                                        onSelect={(selected) => commit(datePart, selected?.[0]?.key, minutePart)}
                                    />
                                </div>
                                <div
                                    className={styles.timeSelect}
                                    data-testid={testId && `${testId}-minute`}
                                >
                                    <Select<string>
                                        label={'Минуты'}
                                        disabled={!datePart}
                                        options={MINUTE_OPTIONS}
                                        value={minutePart}
                                        onSelect={(selected) => commit(datePart, hourPart, selected?.[0]?.key)}
                                    />
                                </div>
                            </div>

                            <Button
                                mode={'primary'}
                                label={'Готово'}
                                className={styles.doneButton}
                                onClick={() => popoutRef.current?.close()}
                            />
                        </>
                    )}
                </div>
            </Popout>

            {errorMessage ? (
                <small className={styles.errorHint}>{errorMessage}</small>
            ) : (
                hint && <small className={styles.hint}>{hint}</small>
            )}
        </div>
    )
}
