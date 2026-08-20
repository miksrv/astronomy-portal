export const AGE_GROUP_LABELS: Record<string, string> = {
    '18to25': '18–25',
    '26to35': '26–35',
    '36to50': '36–50',
    over50: '50+',
    under18: 'до 18'
}

export const AGE_GROUP_ORDER = ['under18', '18to25', '26to35', '36to50', 'over50']

// Children's ages are entered per-child at booking time (`EventBookingForm`'s
// age selector only offers 5–17), so these buckets are sized for that range
// (2-year steps, with the last one widened to 15–17 to cover the remainder)
// rather than mirroring the adult under18/18to25/... groups above.
export const CHILD_AGE_GROUP_LABELS: Record<string, string> = {
    '11to12': '11–12',
    '13to14': '13–14',
    '15to17': '15–17',
    '5to6': '5–6',
    '7to8': '7–8',
    '9to10': '9–10'
}

export const CHILD_AGE_GROUP_ORDER = ['5to6', '7to8', '9to10', '11to12', '13to14', '15to17']
