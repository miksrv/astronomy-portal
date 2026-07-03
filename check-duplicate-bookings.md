# Проверка дублей активных бронирований перед миграцией `AddEventUsersActiveBookingUniqueKey`

Миграция `server/app/Database/Migrations/2026-07-03-100003_AddEventUsersActiveBookingUniqueKey.php`
добавляет `UNIQUE` по паре (`event_id`, `user_id`) среди **активных** бронирований
(`deleted_at IS NULL AND status IN ('pending', 'confirmed')`). Если в базе уже есть
такая пара дублей, миграция целиком откатится с ошибкой вида:

```
Duplicate entry '<event_id>:<user_id>' for key 'uq_events_users_active_booking'
```

Это безопасный отказ (ALTER не применится частично), но деплой остановится, пока
дубли не будут устранены. Ниже — **только читающие** (`SELECT`) запросы, чтобы
заранее проверить прод. Ничего не изменяют и не удаляют.

## 1. Быстрая проверка: есть ли вообще дубли

```sql
SELECT
    event_id,
    user_id,
    COUNT(*) AS active_count
FROM events_users
WHERE deleted_at IS NULL
  AND status IN ('pending', 'confirmed')
GROUP BY event_id, user_id
HAVING COUNT(*) > 1;
```

Если запрос вернул 0 строк — дублей нет, миграцию можно накатывать сразу.

## 2. Подробный отчёт (с названием мероприятия, пользователем и оплатой)

Полезно для принятия решения, что делать с каждым конкретным дублем.

```sql
SELECT
    eu.event_id,
    e.title_ru               AS event_title,
    e.date                   AS event_date,
    eu.user_id,
    u.name                   AS user_name,
    u.email                  AS user_email,
    eu.id                    AS booking_id,
    eu.status                AS booking_status,
    eu.adults,
    eu.children,
    eu.payment_id,
    p.status                 AS payment_status,
    eu.checkin_at,
    eu.created_at,
    eu.updated_at
FROM events_users eu
JOIN events e ON e.id = eu.event_id
LEFT JOIN users u ON u.id = eu.user_id
LEFT JOIN payments p ON p.id = eu.payment_id
WHERE (eu.event_id, eu.user_id) IN (
    SELECT event_id, user_id
    FROM events_users
    WHERE deleted_at IS NULL
      AND status IN ('pending', 'confirmed')
    GROUP BY event_id, user_id
    HAVING COUNT(*) > 1
)
AND eu.deleted_at IS NULL
AND eu.status IN ('pending', 'confirmed')
ORDER BY eu.event_id, eu.user_id, eu.created_at;
```

## Как читать результат

Для каждой пары (`event_id`, `user_id`) с более чем одной строкой нужно решить,
какая из активных броней "настоящая", а какая — исторический дубль:

- Если у одной из строк есть **оплаченный** (`payment_status = 'paid'`) платёж,
  а у другой — нет (`payment_id IS NULL` или платёж не оплачен) — скорее всего,
  настоящая бронь та, что оплачена.
- Если обе строки `confirmed` и без оплаты (бесплатное мероприятие) — вероятно,
  один и тот же человек оказался записан дважды из-за повторной отправки формы
  (двойной клик, ретрай) до того, как в апреле 2026-го появилась проверка
  "уже зарегистрирован", и до того, как в июле 2026-го появилась блокировка
  от гонки. В этом случае одну из строк можно перевести в отменённые
  (soft-delete, `deleted_at`), сохранив более раннюю/более полную как основную.
- Проверьте `checkin_at` — если по одной из дублирующих броней уже был
  чек-ин на мероприятии, её точно не стоит трогать.

**Ничего не удаляйте и не меняйте автоматически** — по каждому найденному дублю
стоит решить вручную, какую строку оставить активной, а какую отменить
(`UPDATE events_users SET deleted_at = NOW() WHERE id = '<id>'`), прежде чем
накатывать миграцию.
