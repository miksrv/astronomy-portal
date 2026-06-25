<?php

return [
    'notFound'           => 'Event not found.',
    'noUpcomingEvents'   => 'No upcoming events.',
    'invalidQrCode'      => 'Invalid QR code.',
    'notExists'          => 'This event does not exist.',
    'alreadyRegistered'  => 'You are already registered for this event.',
    'registrationClosed' => 'Registration for this event has already ended or not yet started.',
    'noTicketsAvailable' => 'Registration is closed — all spots are already booked.',
    'notRegistered'      => 'You are not registered for this event.',
    'bookingSuccess'     => 'You have successfully registered for the event.',
    'cancelSuccess'      => 'You have cancelled your booking.',
    'paymentFailed'      => 'Could not create the payment. Please try again later.',
    'paymentNotFound'    => 'Payment not found.',
    'paymentInvalidCallback' => 'Invalid payment notification signature.',

    // Ticket (rendered onto the PNG ticket image)
    'ticketHeading'      => 'Stargazing ticket',
    'ticketDateLabel'    => 'Date & time',
    'ticketPeopleLabel'  => 'Participants',
    'ticketGuestLabel'   => 'Guest',
    'ticketPeopleValue'  => 'Adults: {0}, children: {1}',
    'ticketShowQr'       => 'Show this QR code at the entrance',
    'ticketDateFormat'   => 'MMMM d, y, HH:mm',

    // Ticket / cancellation emails
    'ticketEmailSubject' => 'Your ticket for the “{0}” stargazing event',
    'ticketEmailTitle'   => 'You are registered!',
    'ticketEmailIntro'   => 'Thank you for registering for the “{0}” stargazing event. Your ticket with a QR code is below. Show it at the entrance.',
    'ticketEmailDate'    => 'Date & time: {0} (Orenburg time, UTC+5)',
    'ticketEmailFooter'  => 'If you cannot make it, please cancel your booking in your profile — it frees up a seat for others.',
    'cancelEmailSubject' => 'Your booking for “{0}” has been cancelled',
    'cancelEmailTitle'   => 'Booking cancelled',
    'cancelEmailIntro'   => 'Your booking for the “{0}” stargazing event has been cancelled. If this was a mistake, you can register again while seats are available.',
];
