# Рефакторинг `EventUpcoming`: разбиение на 3 компонента + общая кнопка отмены

## Проблема

`client/components/pages/stargazing/event-upcoming/EventUpcoming.tsx` (657 строк) — один компонент,
который одновременно отвечает за:

- обложку мероприятия и admin-кнопки (редактировать / статистика / удалить) + диалог удаления;
- уведомления об окне регистрации (мест нет / регистрация ещё не открылась / уже закрылась);
- форму регистрации (встраивает `EventBookingForm`) и guest-prompt для неавторизованных;
- состояние "ожидание оплаты" (таймер, кнопка "вернуться к оплате", проверка статуса оплаты);
- состояние "оплата не прошла" (retry);
- состояние "подтверждено" (билет, точный адрес, счётчик участников, кнопка отмены + диалог подтверждения).

Всё это — вложенные условия в одном JSX-блоке (`mainContent`), из-за чего сложно понять, какая
ветка что рендерит, и любое изменение требует держать в голове все 8 состояний сразу.

## Целевая архитектура

Компонент `EventUpcoming` остаётся, но становится **тонким оркестратором**: обложка, admin-кнопки,
диалог удаления, общие уведомления об окне регистрации и переключение между тремя дочерними
компонентами по состоянию брони. Сама бронь/оплата/билет выносятся в отдельные компоненты.

```
EventUpcoming (оркестратор)
├─ обложка + admin-actions + delete-dialog        (без изменений по сути, только вырезано остальное)
├─ дата/время + "приблизительное" место            (показывается, пока !isConfirmed)
├─ уведомления об окне регистрации (sold-out / opens-in / closed)  (без изменений)
└─ переключение по состоянию:
   ├─ !registered                → EventBookingForm (+ GuestLoginPrompt)      [Компонент 1]
   ├─ registered && (pending|failed) → EventPaymentStatus                     [Компонент 2]
   └─ registered && confirmed    → EventTicketResult                         [Компонент 3]
                                     │
                                     └─ обе (2 и 3) используют → CancelBookingButton [общий]
```

Соответствие `bookingStatus` → компонент уже прямо вытекает из того, что вычисляет
`useEventBookingStatus` (`registered`, `awaitingPayment`, `failedPayment`, `isConfirmed`) — переносим
эту логику без изменений, просто раскладываем JSX по компонентам.

## Новая структура файлов

```
client/components/pages/stargazing/event-upcoming/
├── EventUpcoming.tsx                 (сильно урезан, см. ниже)
├── EventUpcoming.test.tsx            (тесты урезаны до того, что реально осталось в оркестраторе)
├── useEventBookingStatus.ts          (без изменений)
├── useEventBookingSubmit.ts          (без изменений)
├── styles.module.sass                (урезан — стили формы/статуса/билета переезжают в свои папки)
├── no-events.png
├── index.ts
│
├── event-booking-form/               (Компонент 1 — уже существует, БЕЗ изменений)
│   ├── EventBookingForm.tsx
│   ├── EventBookingForm.test.tsx
│   ├── index.ts
│   └── styles.module.sass
│
├── event-payment-status/             (НОВОЕ — Компонент 2)
│   ├── EventPaymentStatus.tsx
│   ├── EventPaymentStatus.test.tsx
│   ├── index.ts
│   └── styles.module.sass
│
├── event-ticket-result/              (НОВОЕ — Компонент 3)
│   ├── EventTicketResult.tsx
│   ├── EventTicketResult.test.tsx
│   ├── index.ts
│   └── styles.module.sass
│
└── cancel-booking-button/            (НОВОЕ — общий для 2 и 3)
    ├── CancelBookingButton.tsx
    ├── CancelBookingButton.test.tsx
    ├── index.ts
    └── styles.module.sass
```

`event-ticket/EventTicket.tsx` (рендер PNG-билета с QR, скачивание) — **не трогаем**, это
самостоятельный лист-компонент, `EventTicketResult` просто его переиспользует, как и сейчас.

---

## Компонент 1 — `EventBookingForm` (без изменений)

Уже соответствует требованиям: поля (имя, телефон, взрослые/дети, возраст детей), блок цены для
платных событий, кнопка "Забронировать" / "Перейти к оплате". Логику отправки не трогаем
(`useEventBookingSubmit`). Guest-prompt и сообщения о недоступности регистрации **не переносим
внутрь формы** — они остаются в оркестраторе (см. ниже), потому что зависят не от полей формы, а от
состояния окна регистрации/авторизации.

---

## Компонент 2 — `EventPaymentStatus` (новый)

Покрывает всё, что происходит **после отправки формы, но до подтверждения**: `bookingStatus ===
'pending'` (включая истёкший таймер) и `bookingStatus === 'failed'`. Логика retry
(`handleRetryPayment`) переезжает сюда из `EventUpcoming`.

**Путь:** `client/components/pages/stargazing/event-upcoming/event-payment-status/EventPaymentStatus.tsx`

**Props:**

```ts
interface EventPaymentStatusProps {
    eventId?: string
    ticketPrice?: number
    memberDefaults: {
        adults?: number
        children?: number
        childrenAges?: number[]
    }
    userName?: string
    userPhone?: string
    awaitingPayment: boolean
    pendingPayment?: ApiModel.Event['payment']
    isVerifyingPayment: boolean
    paymentTimeLeftLabel: string
    paymentLapsed: boolean // registered && bookingStatus === 'pending' && !awaitingPayment
    failedPayment: boolean
    onCancelled: () => void
}
```

**Рендерит (перенос 1:1 из текущего `mainContent`, строки 167–286):**

1. `isVerifyingPayment` → спиннер + "Проверяем статус оплаты…"
2. иначе `awaitingPayment` → заголовок/текст, таймер (`paymentTimeLeftLabel`), кнопка "Вернуться к
   оплате" (`window.location.href = pendingPayment.formUrl`) + `<CancelBookingButton eventId
   onCancelled={onCancelled} />`
3. иначе `paymentLapsed` → "Время на оплату истекло" (транзитное сообщение до рефетча)
4. `failedPayment` → "Оплата не прошла" + текст ошибки retry + кнопка "Попробовать оплатить снова"
   (использует свой `useEventBookingSubmit`)

**Стили:** переносятся правила `.infoBlock`, `.awaitingPaymentActions`, `.verifyingPayment` из
`event-upcoming/styles.module.sass`.

**Тест-файл:** переносятся сценарии из `EventUpcoming.test.tsx`:
- "shows the awaiting-payment panel with a return-to-payment button for a pending booking"
- "shows a retry-payment prompt for a failed booking instead of a confirmed registration"
- "retries the booking with the remembered adults/children and redirects on success"

---

## Компонент 3 — `EventTicketResult` (новый)

Показывается только когда `isConfirmed === true`. Содержит всё, что нужно уже зарегистрированному
участнику: заголовок "Вы зарегистрированы", билет, точный адрес/карты, число участников, подсказку
про отмену + саму кнопку отмены.

**Путь:** `client/components/pages/stargazing/event-upcoming/event-ticket-result/EventTicketResult.tsx`

**Props:**

```ts
interface EventTicketResultProps {
    event: ApiModel.Event
    bookedId?: string // локальный id только что оформленной (free) брони — фолбэк, пока event ещё не перезапрошен
    isPaidConfirmedBooking: boolean
    onCancelled: () => void
}
```

**Рендерит (перенос 1:1 из текущего `mainContent`/JSX, включая заголовок из строк 542–546):**

1. `<h3>Вы зарегистрированы</h3>`
2. `<EventTicket bookingId={event.bookedId || bookedId} />` (существующий компонент, без изменений)
3. Дата/время (те же иконки `Bell`/`Time`, что и в оркестраторе — да, будет небольшое дублирование
   JSX по датам, см. "Осознанные компромиссы" ниже)
4. Точное место + ссылки на Яндекс/Google Карты (текущая "confirmed"-ветка `infoSection` с иконкой
   `Point`)
5. Число участников (`Взрослых: N, детей: N`), если есть `event.members`
6. Подсказка "если не сможете приехать, отмените…" + `<CancelBookingButton eventId
   showRefundNote={isPaidConfirmedBooking} onCancelled={onCancelled} />`, с тем же гардом по датам,
   что и сейчас (не показывать после `registrationEnd` и после даты события)

**Стили:** переносятся `.registeredTitle`, `.ticketBlock`, `.mapLinks`, `.cancelRegistration` +
часть `.infoSection`/`.infoSection .icon` (либо остаются общими в `event-upcoming/styles.module.sass`,
если решим не дублировать — см. ниже).

**Тест-файл:** переносятся сценарии:
- "shows registered title when user is registered"
- "does not update registered state when cancel API call fails (BUG-05 regression)" (частично —
  сама отмена теперь тестируется в `CancelBookingButton.test.tsx`, здесь остаётся проверка, что
  билет/заголовок не пропадают при ошибке отмены)

---

## Общий компонент — `CancelBookingButton`

Сейчас в коде уже фактически один диалог отмены на два места вызова (кнопка в блоке "ожидание
оплаты" и кнопка в блоке "подтверждено" открывают один и тот же `Dialog` и вызывают один и тот же
`cancelRegistration`). Разница только в тексте про возврат денег (`isPaidConfirmedBooking`). Это
готовый кандидат на отдельный компонент.

**Путь:** `client/components/pages/stargazing/event-upcoming/cancel-booking-button/CancelBookingButton.tsx`

**Props:**

```ts
interface CancelBookingButtonProps {
    eventId?: string
    showRefundNote?: boolean // true только для isConfirmed && ticketPrice
    buttonLabel?: string // по умолчанию 'Отменить бронирование'
    className?: string
    onCancelled?: () => void // например setRegistered(false)
}
```

**Инкапсулирует:**
- `useState` для видимости диалога подтверждения;
- `API.useEventsCancelRegistrationPostMutation()`;
- сам `Dialog` с текстами text-1/text-2 + условный абзац про возврат денег (`showRefundNote`);
- кнопку-триггер с `loading`/`disabled` во время запроса.

**Стили:** `.confirmContent`, `.confirmationFooter` переезжают сюда из `event-upcoming/styles.module.sass`.

**Тест-файл:** переносятся сценарии из `EventUpcoming.test.tsx`:
- "opens the cancellation dialog when cancel button is clicked"
- "closes the cancellation dialog when the cancel button inside dialog is clicked"
- "calls cancelRegistration mutation and unregisters user on success"

---

## Что остаётся в `EventUpcoming.tsx` (оркестратор)

- Обложка (`imageContainer`, blur+image) — только для `layout === 'hero'`, как сейчас;
- admin-actions (edit / statistic / delete) + диалог удаления события — без изменений;
- заголовок мероприятия (`<h2>{event.title}</h2>`);
- дата/время + "приблизительное" место (пока `!isConfirmed`) — эта часть теста дублируется с
  `EventTicketResult`, но осознанно (см. ниже);
- уведомления об окне регистрации (нет мест / регистрация не открылась / регистрация закрыта) —
  без изменений в логике;
- сам `useEventBookingStatus` (данные передаются вниз пропами в 3 компонента);
- переключение:

```tsx
{!registered && (
    <>
        {!user?.id && <GuestLoginPrompt ... />}
        {user?.id && registrationAvailable && (
            <EventBookingForm
                eventId={event?.id}
                ticketPrice={event?.ticketPrice}
                onSuccessSubmit={(id) => { setRegistered(true); setBookedId(id) }}
            />
        )}
    </>
)}

{registered && !isConfirmed && (
    <EventPaymentStatus
        eventId={event?.id}
        ticketPrice={event?.ticketPrice}
        memberDefaults={event?.members}
        userName={user?.name}
        userPhone={user?.phone}
        awaitingPayment={awaitingPayment}
        pendingPayment={pendingPayment}
        isVerifyingPayment={isVerifyingPayment}
        paymentTimeLeftLabel={paymentTimeLeftLabel}
        paymentLapsed={event?.bookingStatus === 'pending' && !awaitingPayment}
        failedPayment={failedPayment}
        onCancelled={() => setRegistered(false)}
    />
)}

{isConfirmed && (
    <EventTicketResult
        event={event}
        bookedId={bookedId}
        isPaidConfirmedBooking={isPaidConfirmedBooking}
        onCancelled={() => setRegistered(false)}
    />
)}
```

Итоговый размер `EventUpcoming.tsx` — ориентировочно 200–220 строк вместо 657.

---

## Осознанные компромиссы (чтобы не переусложнить)

1. **Дата/время дублируются** между оркестратором (генерик-версия, пока не подтверждено) и
   `EventTicketResult` (та же дата/время + уже настоящий адрес). Это ~15 строк простого JSX с
   иконками. Не выносим в отдельный `EventScheduleInfo`, чтобы не плодить компонент ради двух
   иконок — но если захочешь, это лёгкая доп. правка потом.
2. **Уведомления об окне регистрации** (sold-out/opens-in/closed) остаются в оркестраторе как есть
   — они про календарь события, а не про то, какую из трёх карточек показывать, поэтому не привязаны
   ни к одному из трёх компонентов.
3. **i18n-ключи не переименовываем.** Все строки остаются под текущим неймспейсом
   `components.pages.stargazing.event-upcoming.*` в `client/public/locales/{en,ru}/translation.json`,
   даже те, что физически переехали в `event-payment-status`/`event-ticket-result`/
   `cancel-booking-button`. Так не придётся трогать локали и гонять `yarn locales:build` — компонент
   физически лежит в другом файле, а ключ — просто строка, ей всё равно. Если важна консистентность
   неймспейса с папкой — это отдельная (чисто механическая) правка, могу сделать по запросу.
4. **`GuestLoginPrompt`** остаётся локальным компонентом внутри `EventUpcoming.tsx`, как сейчас — не
   выносим в отдельный файл, он тривиальный и используется только тут.

---

## Порядок внедрения (по шагам, чтобы не сломать разом всё)

1. Вынести `CancelBookingButton` первым (наименее рискованно — просто извлечение существующего
   диалога), подключить оба места вызова, прогнать тесты.
2. Вынести `EventTicketResult`, перенести JSX + стили confirmed-ветки, подключить.
3. Вынести `EventPaymentStatus`, перенести JSX + стили pending/failed-ветки + `handleRetryPayment`,
   подключить.
4. Урезать `EventUpcoming.tsx` до оркестратора.
5. Разнести тесты из `EventUpcoming.test.tsx` по новым `*.test.tsx` (см. списки выше), оставить в
   `EventUpcoming.test.tsx` только: no-event placeholder, заголовок события, admin-actions
   (edit/statistic/delete + диалог удаления), и по одному smoke-тесту на каждое из 3 состояний
   (что нужный дочерний компонент действительно рендерится).
6. Прогнать вручную на `/stargazing` и `/profile` (`layout='hero'` и `'compact'`) все состояния:
   гость, форма доступна, форма недоступна (sold-out/не открыта/закрыта), ожидание оплаты, оплата не
   прошла, подтверждено, admin-режим.
7. `yarn eslint:fix && yarn prettier:fix && yarn test && yarn build`.

## Зона риска

- `EventUpcoming.test.tsx` мокает `./event-booking-form` целиком — после рефакторинга такой же мок
  понадобится для `./event-payment-status` и `./event-ticket-result` в тех тестах оркестратора, где
  их внутренности не важны (упростит smoke-тесты в п.5).
- `bookedId`/`setBookedId` и `registered`/`setRegistered` — стейт, которым сейчас управляет
  `useEventBookingStatus` и меняет сам `EventUpcoming` через колбэки (`onSuccessSubmit`,
  `onCancelled`). Эта связь должна остаться прежней — новые компоненты только вызывают колбэки,
  но не хранят это состояние сами.
