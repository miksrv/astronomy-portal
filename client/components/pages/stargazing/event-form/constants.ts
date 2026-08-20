// `DateTimeInput` renders no native input (no `name` attribute reaches the
// DOM) and its existing `data-testid`s (kept as-is - EventForm.test.tsx
// already queries them) don't equal the RHF field name, so
// `scrollToFirstFieldError` needs the mapping spelled out explicitly.
export const DATE_FIELD_ALIASES: Record<string, string> = {
    endDate: 'end-date',
    registrationStart: 'registration-start',
    registrationEnd: 'registration-end'
}
