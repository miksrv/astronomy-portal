import React, { useRef } from 'react'
import dayjs from 'dayjs'
import { Button, Calendar, Icon, Popout, Select } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export interface DateTimePickerProps {
    /** Label text displayed above the field, same convention as `Input`/`Select`. */
    label?: string
    /** Current value as a `datetime-local`-compatible string ("YYYY-MM-DDTHH:mm"). */
    value?: string
    /** Marks the field as required (adds a visual asterisk, matches `Input`). */
    required?: boolean
    /** Disables the trigger and every control inside the popout. */
    disabled?: boolean
    /** Error message shown below the field instead of `hint`. */
    error?: string
    /** Helper text shown below the field when there is no `error`. */
    hint?: string
    /** Earliest selectable date ("YYYY-MM-DD"), forwarded to the calendar. */
    minDate?: string
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
 * Custom date + time picker used instead of a native `<input type="datetime-local">`
 * — browser-native pickers render inconsistently across browsers/OSes and are
 * awkward on mobile. Combines the kit's own `Calendar` (date grid) with two
 * `Select` dropdowns (hour/minute) inside a `Popout`, and produces the same
 * "YYYY-MM-DDTHH:mm" string a `datetime-local` input would, so it's a drop-in
 * replacement for existing form state.
 */
export const DateTimePicker: React.FC<DateTimePickerProps> = ({
    label,
    value,
    required,
    disabled,
    error,
    hint,
    minDate,
    className,
    testId,
    onChange
}) => {
    // Typed structurally (rather than importing `PopoutHandleProps`) so this
    // file only needs one import statement from 'simple-react-ui-kit' — a
    // mix of a value and a type-only import from the same module trips up
    // this project's import-sort/no-duplicate-imports combination.
    const popoutRef = useRef<{ close: () => void }>(null)

    const parsed = value ? dayjs(value) : undefined
    const isValid = !!parsed && parsed.isValid()

    const datePart = isValid ? parsed!.format('YYYY-MM-DD') : undefined
    const hourPart = isValid ? parsed!.format('HH') : undefined
    const minutePart = isValid ? parsed!.format('mm') : undefined

    const commit = (nextDate?: string, nextHour?: string, nextMinute?: string) => {
        if (!nextDate) {
            return
        }

        onChange?.(`${nextDate}T${nextHour ?? '00'}:${nextMinute ?? '00'}`)
    }

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
                        className={[styles.trigger, error && styles.triggerError].filter(Boolean).join(' ')}
                        disabled={disabled}
                    >
                        <Icon
                            name={'Calendar'}
                            className={styles.triggerIcon}
                        />
                        <span className={isValid ? styles.triggerValue : styles.triggerPlaceholder}>
                            {isValid ? parsed!.format('DD.MM.YYYY, HH:mm') : 'Выберите дату и время'}
                        </span>
                    </button>
                }
            >
                <div className={styles.panel}>
                    <div data-testid={testId && `${testId}-calendar`}>
                        <Calendar
                            locale={'ru'}
                            highlightToday={true}
                            minDate={minDate}
                            datePeriod={[datePart, datePart]}
                            onDateSelect={(date) => commit(date, hourPart, minutePart)}
                        />
                    </div>

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
                </div>
            </Popout>

            {error ? (
                <small className={styles.errorHint}>{error}</small>
            ) : (
                hint && <small className={styles.hint}>{hint}</small>
            )}
        </div>
    )
}
