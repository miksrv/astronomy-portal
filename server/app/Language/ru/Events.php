<?php

return [
    'notFound'           => 'Мероприятие не найдено.',
    'hasRegistrations'   => 'Нельзя удалить мероприятие, на которое уже есть регистрации. Сначала отмените все бронирования.',
    'noUpcomingEvents'   => 'Нет предстоящих мероприятий.',
    'invalidQrCode'      => 'QR-код не верный.',
    'notExists'          => 'Такого мероприятия не существует.',
    'alreadyRegistered'  => 'Вы уже зарегистрировались на это мероприятие.',
    'registrationClosed' => 'Регистрация на мероприятие уже закончилась или ещё не начиналась.',
    'noTicketsAvailable' => 'Регистрация закрыта — все места уже забронированы.',
    'notRegistered'      => 'Вы ещё не регистрировались на это мероприятие.',
    'bookingNotConfirmed' => 'Эта регистрация ещё не подтверждена.',
    'invalidDateFormat'   => 'Неверный формат даты.',
    'invalidRegistrationWindow' => 'Некорректный период регистрации: он должен открываться до закрытия и заканчиваться не позднее даты мероприятия.',
    'invalidEventEndDate' => 'Время окончания мероприятия должно быть позже времени начала.',
    'registrationNotRequired' => 'Для этого мероприятия регистрация не требуется.',
    'invalidRequiresRegistrationValue' => 'Некорректное значение поля "требуется регистрация" — ожидается логическое значение.',
    'cannotDisableRegistrationWithBookings' => 'Нельзя отключить регистрацию — на это мероприятие уже есть активные записи.',
    'bookingSuccess'     => 'Вы успешно зарегистрировались на мероприятие.',
    'cancelSuccess'      => 'Вы отменили бронирование на это мероприятие.',
    'paymentFailed'      => 'Не удалось создать платёж. Пожалуйста, попробуйте позже.',
    'paymentNotFound'    => 'Платёж не найден.',
    'paymentInvalidCallback' => 'Неверная подпись уведомления об оплате.',
    'noPaymentLinked'    => 'У этой регистрации нет привязанного платежа.',
    'paymentVerifiedConfirmed' => 'Транзакция успешна — регистрация подтверждена.',
    'paymentVerifiedFailed'    => 'Транзакция не прошла — регистрация остаётся неподтверждённой.',
    'paymentVerifiedPending'   => 'Транзакция ещё в обработке.',
    'refundAlreadyCanceled' => 'Эта регистрация уже отменена.',
    'refundNotPaid'      => 'Возврат невозможен: платёж не в статусе «Оплачен».',
    'refundAlreadyDone'  => 'Возврат уже был выполнен ранее.',
    'refundSuccess'      => 'Возврат выполнен, регистрация аннулирована.',
    'refundFailed'       => 'Банк отклонил возврат: {0}',

    // Ticket (rendered onto the PNG ticket image)
    'ticketHeading'           => 'Билет на астровыезд',
    'ticketParticipantsLabel' => 'Участников',
    'ticketAdultsValue'       => '{0} взрослых',
    'ticketChildrenValue'     => '{0} детей',
    'ticketDateLine'          => 'EEEE, d MMMM y',

    // Cancellation email (the ticket confirmation email is static Russian —
    // see Views/email_ticket.php — not routed through lang())
    'cancelEmailSubject' => 'Бронирование на астровыезд «{0}» отменено',
    'cancelEmailTitle'   => 'Бронирование отменено',
    'cancelEmailIntro'   => 'Ваше бронирование на астровыезд «{0}» отменено. Если это произошло по ошибке, вы можете зарегистрироваться снова, пока есть свободные места.',

    // Refund email (admin-initiated forced refund)
    'refundEmailSubject' => 'Оплата за астровыезд «{0}» возвращена',
    'refundEmailTitle'   => 'Бронирование отменено, деньги возвращены',
    'refundEmailIntro'   => 'Ваше бронирование на астровыезд «{0}» отменено, оплата полностью возвращена на карту, с которой производился платёж. Возврат обычно поступает в течение 1–10 рабочих дней.',
];
