import { ApiModel, ApiType } from '@/api'

export interface ReqList {
    /**
     * Narrows the list to events the given user attended — the profile
     * history section passes its own id here. The API only honours this
     * when it matches the caller's own session id; anyone else's id is
     * silently ignored (falls back to the plain public list) rather than
     * rejected, so it can't be used to probe another user's history.
     */
    userId?: string
}

export interface ResList {
    items?: ApiModel.Event[]
}

export type ResItem = ApiModel.Event

export type ResMedia = ApiModel.EventMedia

export type ResCheckin = Pick<ApiModel.Event, 'members'> & {
    checkin?: ApiType.DateTime
    /** Guest display name, resolved server-side — present only for the staff check-in flow. */
    name?: string
    /** Present only when the viewer is the booking owner (not staff) — the event to redirect them to. */
    eventId?: string
}

export type EventFormType = Partial<
    Omit<
        ApiModel.Event,
        | 'date'
        | 'endDate'
        | 'availableTickets'
        | 'registrationStart'
        | 'registrationEnd'
        | 'ticketPrice'
        | 'latitude'
        | 'longitude'
        | 'minAge'
    >
> & {
    date?: string
    endDate?: string
    registrationStart?: string
    registrationEnd?: string
    tickets?: string
    ticketPrice?: string
    latitude?: string
    longitude?: string
    minAge?: string
    upload?: File
}

/* Media List */
export interface ReqMediaList {
    eventId?: string
    limit?: number
    /** Number of rows to skip, for pagination — mirrors the comments API. */
    offset?: number
    order?: 'date' | 'rand'
    /** Exact photographer credit to filter by; omitted/undefined means "all photographers". */
    photographer?: string
}

export interface ResMediaList {
    /** Total matching rows, ignoring pagination — same shape as the comments list response. */
    total?: number
    items?: ApiModel.EventMedia[]
    /**
     * Every distinct photographer credit for the event, regardless of this
     * request's own `limit`/`offset`/`photographer` filter — used for the
     * gallery's filter chips and the upload dialog's autocomplete.
     */
    photographers?: string[]
}

/* Chunked media upload (FEAT-26) — replaces the old single-request ReqUploadPhoto */

export interface ReqMediaUploadInit {
    eventId: string
    fileName: string
    mimeType: string
    totalSize: number
    mediaType: ApiModel.EventMediaType
}

export interface ResMediaUploadInit {
    sessionId: string
    /** Server-authoritative chunk size in bytes — the client must slice the file with this, never a hardcoded value. */
    chunkSize: number
}

export interface ReqMediaUploadChunk {
    sessionId: string
    /** `chunkIndex` (number) + `chunk` (Blob), built by `chunkedUpload.ts`. */
    formData: FormData
}

export interface ResMediaUploadChunk {
    /** Chunk indices the server has received so far for this session. */
    receivedChunks: number[]
    receivedBytes: number
}

export interface ReqMediaUploadFinalize {
    /** Not sent to the server — only used locally to invalidate the right `EventMedia`/`Events` cache tags once this resolves. */
    eventId: string
    sessionId: string
    /** `photographerName?`, `takenAt?` (photo) or `duration`/`width`/`height` + `poster` (video), built by `chunkedUpload.ts`. */
    formData: FormData
}

export type ResMediaUploadFinalize = ApiModel.EventMedia

export interface ReqMediaUploadCancel {
    sessionId: string
}

export interface ResMediaUploadCancel {
    status: 'aborted'
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

/* Registrations (admin roster) */
export interface EventRegistration {
    id: string
    userId: string
    name: string
    email: string
    adults: number
    children: number
    /** Ages entered per child at booking time (see `ReqRegistration.childrenAges`); may be shorter than `children` for old bookings made before this field existed. */
    childrenAges?: number[]
    status: 'pending' | 'confirmed' | 'failed'
    createdAt: string
    checkinAt?: string
    deletedAt?: string
    paymentId?: string
    paymentOrderId?: string
    paymentStatus?: PaymentStatus
    paymentErrorMessage?: string
}

export interface ResEventRegistrationsList {
    items: EventRegistration[]
}

export interface ReqVerifyRegistrationPayment {
    id: string
    eventId: string
}

export interface ResVerifyRegistrationPayment {
    paymentStatus: PaymentStatus
    registrationStatus: 'pending' | 'confirmed' | 'failed'
    message: string
}

export interface ReqRefundRegistrationPayment {
    id: string
    eventId: string
}

export interface ResRefundRegistrationPayment {
    paymentStatus: PaymentStatus
    registrationStatus: 'pending' | 'confirmed' | 'failed'
    message: string
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
