// Loose on purpose (international formats vary a lot, and PhoneInput already
// strips anything but digits/+/-/()/spaces as the user types) - just enough
// digits to reject stray/incomplete input, not a strict phone format check.
export const PHONE_MIN_DIGITS = 6
