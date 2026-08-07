<?php

return [
    'notFound'           => 'Event not found.',
    'hasRegistrations'   => 'This event cannot be deleted because it already has registrations. Cancel all bookings first.',
    'noUpcomingEvents'   => 'No upcoming events.',
    'invalidQrCode'      => 'Invalid QR code.',
    'notExists'          => 'This event does not exist.',
    'alreadyRegistered'  => 'You are already registered for this event.',
    'registrationClosed' => 'Registration for this event has already ended or not yet started.',
    'noTicketsAvailable' => 'Registration is closed — all spots are already booked.',
    'notRegistered'      => 'You are not registered for this event.',
    'bookingNotConfirmed' => 'This registration has not been confirmed yet.',
    'invalidDateFormat'   => 'Invalid date format.',
    'invalidRegistrationWindow' => 'Invalid registration window: it must open before it closes, and close no later than the event date.',
    'invalidEventEndDate' => 'The event end time must be later than the start time.',
    'registrationNotRequired' => 'This event does not require registration.',
    'invalidRequiresRegistrationValue' => 'Invalid value for "requires registration" — expected a boolean.',
    'cannotDisableRegistrationWithBookings' => 'Cannot disable registration — this event already has active bookings.',
    'bookingSuccess'     => 'You have successfully registered for the event.',
    'cancelSuccess'      => 'You have cancelled your booking.',
    'paymentFailed'      => 'Could not create the payment. Please try again later.',
    'paymentNotFound'    => 'Payment not found.',
    'paymentInvalidCallback' => 'Invalid payment notification signature.',
    'noPaymentLinked'    => 'This registration has no linked payment.',
    'paymentVerifiedConfirmed' => 'Transaction succeeded — the registration has been confirmed.',
    'paymentVerifiedFailed'    => 'Transaction failed — the registration remains unconfirmed.',
    'paymentVerifiedPending'   => 'Transaction is still pending.',
    'refundAlreadyCanceled' => 'This registration has already been cancelled.',
    'refundNotPaid'      => 'Refund is not possible: the payment is not in the "Paid" status.',
    'refundAlreadyDone'  => 'This payment has already been refunded.',
    'refundSuccess'      => 'Refund completed — the registration has been cancelled.',
    'refundFailed'       => 'The bank declined the refund: {0}',

    // Ticket (rendered onto the PNG ticket image)
    'ticketHeading'           => 'Stargazing event ticket',
    'ticketParticipantsLabel' => 'Participants',
    'ticketAdultsValue'       => '{0} adults',
    'ticketChildrenValue'     => '{0} children',
    'ticketDateLine'          => 'EEEE, MMMM d, y',

    // Cancellation email (the ticket confirmation email is static Russian —
    // see Views/email_ticket.php — not routed through lang())
    'cancelEmailSubject' => 'Your booking for “{0}” has been cancelled',
    'cancelEmailTitle'   => 'Booking cancelled',
    'cancelEmailIntro'   => 'Your booking for the “{0}” stargazing event has been cancelled. If this was a mistake, you can register again while seats are available.',

    // Refund email (admin-initiated forced refund)
    'refundEmailSubject' => 'Your payment for “{0}” has been refunded',
    'refundEmailTitle'   => 'Booking cancelled, payment refunded',
    'refundEmailIntro'   => 'Your booking for the “{0}” stargazing event has been cancelled and the payment has been fully refunded to the card it was made from. Refunds usually arrive within 1–10 business days.',
];
