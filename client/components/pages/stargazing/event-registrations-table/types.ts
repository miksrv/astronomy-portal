import { ApiType } from '@/api'
import { DisplayStatus } from '@/utils/eventRegistrations'

export interface EventRegistrationsTableProps {
    eventId: string
}

export type RegistrationRow = ApiType.Events.EventRegistration & { displayStatus: DisplayStatus }

export const ALFABANK_TRANSACTION_URL = 'https://payment.alfabank.ru/generalmp3/admin/transactions/'
