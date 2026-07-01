import { ApiModel, ApiType } from '@/api'

export interface ResList {
    items?: ApiModel.Event[]
}

export type ResItem = ApiModel.Event

export type ResPhoto = ApiModel.EventPhoto

export type ResCheckin = Pick<ApiModel.Event, 'members'> & {
    checkin?: ApiType.DateTime
}

export type EventFormType = Partial<
    Omit<ApiModel.Event, 'date' | 'availableTickets' | 'registrationStart' | 'registrationEnd' | 'ticketPrice'>
> & {
    date?: string
    registrationStart?: string
    registrationEnd?: string
    tickets?: string
    ticketPrice?: string
    upload?: File
}

/* Photo List */
export interface ReqPhotoList {
    eventId?: string
    limit?: number
    order?: 'date' | 'rand'
}

export interface ResPhotoList {
    count?: number
    items?: ApiModel.EventPhoto[]
}

export interface ReqUploadPhoto {
    formData?: FormData
    eventId?: string
}

/* Registration */
export interface ReqRegistration {
    eventId: string
    adults?: number
    children?: number
    name?: string
    phone?: string
    childrenAges?: number[]
}

export interface ResRegistrationPayment {
    /** Bank payment page URL the user must be redirected to. */
    formUrl: string
    /** Gateway order id, used to poll the payment status on return. */
    orderId: string
    /** Total amount to pay, in RUB. */
    amount: number
}

export interface ResRegistration {
    result: boolean
    message?: string
    /** Booking id (events_users.id) — present for free events, used to render the ticket. */
    bookingId?: string
    /** Present only for paid events — the client redirects to `payment.formUrl`. */
    payment?: ResRegistrationPayment
}

/* Payment status */
export type PaymentStatus = 'new' | 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded'

export interface ReqPaymentStatus {
    orderId: string
}

export interface ResPaymentStatus {
    status: PaymentStatus
    message?: string
    /** Present when status is 'failed' or 'canceled' — the bank's decline reason, if available. */
    errorMessage?: string
    /** Booking id (events_users.id) for event-booking payments — used to render the ticket. */
    bookingId?: string
}

/* Users List */
export interface ResUsersList {
    count?: number
    items?: ApiModel.EventUser[]
}

/* Cover */
export interface ReqUpdateCover {
    id: string
    formData: FormData
}

export interface ResUpdateCover {
    coverFileName: string
    coverFileExt: string
}

/* Statistic */
export interface ResEventStatistic {
    totalRegistrations: number
    totalAdults: number
    totalChildren: number
    totalParticipants: number
    checkinCount: number
    averageAge: number | null
    genderStats: {
        male: number
        female: number
        unknown: number
    }
    ageGroups: Array<{
        group: 'under18' | '18to25' | '26to35' | '36to50' | 'over50'
        count: number
    }>
    registrationTimeline: Array<{
        datetime: string // 'YYYY-MM-DD HH:MM:SS'
        cumulative: number
    }>
}
