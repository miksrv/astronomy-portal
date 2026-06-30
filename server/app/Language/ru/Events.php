<?php

return [
    'notFound'           => 'Мероприятие не найдено.',
    'noUpcomingEvents'   => 'Нет предстоящих мероприятий.',
    'invalidQrCode'      => 'QR-код не верный.',
    'notExists'          => 'Такого мероприятия не существует.',
    'alreadyRegistered'  => 'Вы уже зарегистрировались на это мероприятие.',
    'registrationClosed' => 'Регистрация на мероприятие уже закончилась или ещё не начиналась.',
    'noTicketsAvailable' => 'Регистрация закрыта — все места уже забронированы.',
    'notRegistered'      => 'Вы ещё не регистрировались на это мероприятие.',
    'bookingSuccess'     => 'Вы успешно зарегистрировались на мероприятие.',
    'cancelSuccess'      => 'Вы отменили бронирование на это мероприятие.',
    'paymentFailed'      => 'Не удалось создать платёж. Пожалуйста, попробуйте позже.',
    'paymentNotFound'    => 'Платёж не найден.',
    'paymentInvalidCallback' => 'Неверная подпись уведомления об оплате.',

    // Ticket (rendered onto the PNG ticket image)
    'ticketHeading'      => 'Билет на астровыезд',
    'ticketDateLabel'    => 'Дата и время',
    'ticketPeopleLabel'  => 'Участники',
    'ticketGuestLabel'   => 'Участник',
    'ticketPeopleValue'  => 'Взрослых: {0}, детей: {1}',
    'ticketShowQr'       => 'Покажите QR-код на входе',
    'ticketDateFormat'   => 'd MMMM y, HH:mm',

    // Ticket / cancellation emails
    'ticketEmailSubject' => 'Ваш билет на астровыезд «{0}»',
    'ticketEmailTitle'   => 'Вы зарегистрированы!',
    'ticketEmailIntro'   => 'Спасибо за регистрацию на астровыезд «{0}». Ваш билет с QR-кодом — ниже. Покажите его при входе на мероприятие.',
    'ticketEmailDate'    => 'Дата и время: {0} (Оренбургское время, UTC+5)',
    'ticketEmailFooter'  => 'Если вы не сможете приехать, пожалуйста, отмените бронирование в личном кабинете — это освободит место для других.',
    'cancelEmailSubject' => 'Бронирование на астровыезд «{0}» отменено',
    'cancelEmailTitle'   => 'Бронирование отменено',
    'cancelEmailIntro'   => 'Ваше бронирование на астровыезд «{0}» отменено. Если это произошло по ошибке, вы можете зарегистрироваться снова, пока есть свободные места.',
];
