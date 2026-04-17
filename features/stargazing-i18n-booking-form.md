# FEAT-19 — i18n Fixes in EventBookingForm

**Status:** Planned  
**Priority:** High  
**Affects:** Frontend (Next.js) only  
**Parallel implementation:** N/A — small self-contained fix.

---

## Overview

`EventBookingForm.tsx` contains multiple hardcoded Russian strings that are not wrapped in `t()`. When the user switches to English locale, the booking form stays in Russian. This is a straightforward fix: wrap all strings in `useTranslation()` and add keys to both locale files.

---

## Current Hardcoded Strings

File: `client/components/pages/stargazing/event-upcoming/event-booking-form/EventBookingForm.tsx`

| Location | Current string |
|---|---|
| Error `<Message>` title | `'Ошибка'` |
| Error `<Message>` body | `'При регистрации были допущены ошибки...'` |
| Success `<Message>` title | `'Успешно!'` |
| Success `<Message>` body | `'Вы зарегистрировались на мероприятие'` |
| Input label | `'Укажите ваше имя'` |
| Input placeholder | `'Укажите ваше имя'` |
| Input label | `'Укажите ваш номер телефона'` |
| Input placeholder | `'Укажите ваш номер телефона'` |
| Select label | `'Взрослых'` |
| Select label | `'Детей'` |
| Children age label | `'Возраст ребенка'` |
| Age option suffix | `'{n} лет'` |
| Submit button | `'Забронировать'` |

---

## Frontend Tasks

### FE-1 — Add `useTranslation` and wrap all strings

Replace each hardcoded string with `t('key', 'fallback')`. Key prefix: `components.pages.stargazing.event-booking-form`.

### FE-2 — Add i18n keys to locale files

**`client/public/locales/ru/translation.json`** — under `components.pages.stargazing.event-booking-form`:
```json
{
  "error-title": "Ошибка",
  "error-body": "При регистрации были допущены ошибки, проверьте правильность заполнения полей",
  "success-title": "Успешно!",
  "success-body": "Вы зарегистрировались на мероприятие",
  "name-label": "Укажите ваше имя",
  "phone-label": "Укажите ваш номер телефона",
  "adults-label": "Взрослых",
  "children-label": "Детей",
  "child-age-label": "Возраст ребёнка {{index}}",
  "child-age-placeholder": "Выберите возраст",
  "child-age-option": "{{age}} лет",
  "submit": "Забронировать"
}
```

**`client/public/locales/en/translation.json`** — same keys in English:
```json
{
  "error-title": "Error",
  "error-body": "There were errors in your registration, please check the form fields",
  "success-title": "Success!",
  "success-body": "You have been registered for the event",
  "name-label": "Enter your name",
  "phone-label": "Enter your phone number",
  "adults-label": "Adults",
  "children-label": "Children",
  "child-age-label": "Child {{index}} age",
  "child-age-placeholder": "Select age",
  "child-age-option": "{{age}} years",
  "submit": "Book"
}
```

### FE-3 — Run after changes

```bash
yarn eslint:fix && yarn prettier:fix && yarn test
```

---

## Acceptance Criteria

- [ ] No hardcoded Russian strings remain in `EventBookingForm.tsx`
- [ ] All strings use `t()` with the correct key prefix
- [ ] Both `ru` and `en` locale files contain all new keys
- [ ] Switching locale to `en` shows the form in English
- [ ] All existing tests pass
