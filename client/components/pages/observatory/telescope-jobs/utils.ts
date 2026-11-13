import { TFunction } from 'i18next'

import { ApiModel } from '@/api'
import { formatCalendarDate, formatUTCDate, TIME_ZONE } from '@/utils/dates'
import { formatObservatoryTime } from '@/utils/visibility'

import { FINAL_STATUSES, SHOWN_FIELDS } from './constants'

/** Total exposure of a plan, seconds */
export const totalSeconds = (plan: ApiModel.TelescopePlanRow[]): number =>
    plan.reduce((sum, row) => sum + (Number(row.exposure) || 0) * (Number(row.count) || 0), 0)

/** "2 ч 15 мин", "45 мин" */
export const formatDuration = (seconds: number, t: TFunction): string => {
    const minutes = Math.round(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60

    if (!hours) {
        return t('components.pages.observatory.telescope-jobs.minutes', '{{count}} мин', { count: rest })
    }

    return rest
        ? t('components.pages.observatory.telescope-jobs.hours-minutes', '{{hours}} ч {{minutes}} мин', {
              hours,
              minutes: rest
          })
        : t('components.pages.observatory.telescope-jobs.hours', '{{count}} ч', { count: hours })
}

/** A number typed into a form field ("12,5" too), or null when it is empty or not one */
export const toNumber = (text: string): number | null => {
    const value = Number(text.replace(',', '.'))

    return text.trim() !== '' && Number.isFinite(value) ? value : null
}

/** Today's date at the observatory, `YYYY-MM-DD`: the server compares `validUntil` with it, not with UTC */
export const observatoryToday = (): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date())

/** A field error the job form shows next to its input; any other one falls back to the generic message */
export const isShownField = (key: string): boolean =>
    SHOWN_FIELDS.includes(key) || /^plan\.\d+\.(filter|exposure|count)$/.test(key)

export const isFinal = (status: ApiModel.TelescopeJobStatus): boolean => FINAL_STATUSES.includes(status)

/** The author (or a manager) may still cancel it: not final and no cancel already asked for */
export const canCancel = (job: ApiModel.TelescopeJob): boolean => !isFinal(job.status) && !job.cancelRequested

/**
 * A manager may delete it outright: still waiting for approval (the observatory never got it),
 * or final. An approved job may already be in the observatory's schedule: it is cancelled first
 */
export const canRemove = (job: ApiModel.TelescopeJob): boolean => job.status === 'pending' || isFinal(job.status)

/**
 * A date in the site's format, "5 нояб. 2026": a calendar date (`YYYY-MM-DD`, a night) as it is,
 * a moment — as the day it fell on at the observatory
 */
export const formatDate = (iso: string | null | undefined, locale: string): string =>
    iso ? formatCalendarDate(iso.length === 10 ? iso : formatUTCDate(iso, 'YYYY-MM-DD'), locale) : '—'

/** A moment as the time of day at the observatory, "21:40" */
export const formatTime = (iso: string | null | undefined, locale: string): string =>
    formatObservatoryTime(iso ? new Date(iso) : undefined, locale)

export const statusLabel = (status: JobDisplayStatus, t: TFunction): string =>
    ({
        cancelling: t('components.pages.observatory.telescope-jobs.status-cancelling', 'Отменяется'),
        paused: t('components.pages.observatory.telescope-jobs.status-paused', 'Приостановлено'),
        approved: t('components.pages.observatory.telescope-jobs.status-approved', 'Одобрено'),
        cancelled: t('components.pages.observatory.telescope-jobs.status-cancelled', 'Отменено'),
        completed: t('components.pages.observatory.telescope-jobs.status-completed', 'Выполнено'),
        expired: t('components.pages.observatory.telescope-jobs.status-expired', 'Срок истёк'),
        failed: t('components.pages.observatory.telescope-jobs.status-failed', 'Не выполнено'),
        pending: t('components.pages.observatory.telescope-jobs.status-pending', 'Ждёт одобрения'),
        queued: t('components.pages.observatory.telescope-jobs.status-queued', 'В очереди'),
        rejected: t('components.pages.observatory.telescope-jobs.status-rejected', 'Отклонено'),
        running: t('components.pages.observatory.telescope-jobs.status-running', 'Снимается')
    })[status]

/** "Широкополосные" / "Узкополосные" for the groups of tonight's plan */
export const groupLabel = (group: string, t: TFunction): string =>
    group === 'nb'
        ? t('components.pages.observatory.telescope-jobs.group-nb', 'узкополосные')
        : t('components.pages.observatory.telescope-jobs.group-bb', 'широкополосные')

/** The global star map centred on a point of the sky (J2000 degrees) */
export const starMapLink = (ra: number, dec: number, zoom = 4): string =>
    `/starmap?view=sky&c=${Number(ra.toFixed(4))},${Number(dec.toFixed(4))},0&z=${zoom}`

/** "12 из 30 кадров" — frames captured over the whole plan (never more than planned per filter) */
export const framesDone = (job: ApiModel.TelescopeJob): { done: number; total: number } => ({
    done: job.plan.reduce((sum, row) => sum + Math.min(job.progress[row.filter] ?? 0, row.count), 0),
    total: job.plan.reduce((sum, row) => sum + row.count, 0)
})

/** The agent's reason or warning in the viewer's language (see `ApiModel.TelescopeNotice`) */
export const noticeText = (notice: ApiModel.TelescopeNotice, t: TFunction): string => {
    if (typeof notice === 'string') {
        return notice
    }

    const p = notice as Record<string, unknown>
    const list = (value: unknown): string => (Array.isArray(value) ? value.join(', ') : String(value ?? ''))

    switch (notice.code) {
        case 'status':
            return t('components.pages.observatory.telescope-jobs.notice-status', 'статус: {{status}}', {
                status: statusLabel(p.status as ApiModel.TelescopeJobStatus, t) ?? String(p.status)
            })
        case 'cancel-requested':
            return t('components.pages.observatory.telescope-jobs.notice-cancel-requested', 'запрошена отмена')
        case 'held':
            return t('components.pages.observatory.telescope-jobs.notice-held', 'приостановлено администратором')
        case 'complete':
            return t('components.pages.observatory.telescope-jobs.notice-complete', 'все кадры сняты')
        case 'filters-missing':
            return t(
                'components.pages.observatory.telescope-jobs.notice-filters-missing',
                'в колесе нет фильтров: {{filters}}',
                { filters: list(p.filters) }
            )
        case 'no-darkness':
            return t('components.pages.observatory.telescope-jobs.notice-no-darkness', 'этой ночью не темнеет')
        case 'not-observable':
            return t(
                'components.pages.observatory.telescope-jobs.notice-not-observable',
                '{{group}}: видно только {{minutes}} мин этой ночью',
                {
                    group: groupLabel(String(p.group), t),
                    minutes: p.minutes
                }
            )
        case 'patrol-no-l':
            return t(
                'components.pages.observatory.telescope-jobs.notice-patrol-no-l',
                'для патруля нет фильтра L в колесе'
            )
        case 'indi-offline':
            return t('components.pages.observatory.telescope-jobs.notice-indi-offline', 'INDI не запущен')
        case 'no-filter-wheel':
            return t(
                'components.pages.observatory.telescope-jobs.notice-no-filter-wheel',
                'колесо фильтров не подключено'
            )
        case 'no-focuser':
            return t(
                'components.pages.observatory.telescope-jobs.notice-no-focuser',
                'фокусер не подключён: шаг Focus не выполнится'
            )
        case 'no-guider':
            return t(
                'components.pages.observatory.telescope-jobs.notice-no-guider',
                'гид-камера не подключена: шаг Guide не выполнится'
            )
        case 'files-not-written':
            return t(
                'components.pages.observatory.telescope-jobs.notice-files-not-written',
                'файлы для Ekos не записаны: {{error}}',
                { error: p.error }
            )
        case 'load-off':
            return t(
                'components.pages.observatory.telescope-jobs.notice-load-off',
                'загрузка в Ekos выключена в настройках агента'
            )
        case 'ekos-off':
            return t('components.pages.observatory.telescope-jobs.notice-ekos-off', 'доступ агента к Ekos выключен')
        case 'wheel-unknown':
            return t(
                'components.pages.observatory.telescope-jobs.notice-wheel-unknown',
                'имена фильтров неизвестны: колесо не подключено'
            )
        case 'load-failed-before':
            return t(
                'components.pages.observatory.telescope-jobs.notice-load-failed-before',
                'прошлая загрузка этого плана не удалась — ждём изменений'
            )
        case 'ekos-unreachable':
            return t('components.pages.observatory.telescope-jobs.notice-ekos-unreachable', 'Ekos недоступен')
        case 'nothing-to-load':
            return t('components.pages.observatory.telescope-jobs.notice-nothing-to-load', 'загружать нечего')
        case 'scheduler-busy':
            return t('components.pages.observatory.telescope-jobs.notice-scheduler-busy', 'Scheduler сейчас занят')
        case 'foreign-jobs':
            return t(
                'components.pages.observatory.telescope-jobs.notice-foreign-jobs',
                'в Scheduler есть задания, загруженные вручную: {{names}}',
                { names: list(p.names) }
            )
        case 'load-failed':
            return t(
                'components.pages.observatory.telescope-jobs.notice-load-failed',
                'загрузка не удалась: {{error}}',
                { error: p.error }
            )
        case 'load-mismatch':
            return t(
                'components.pages.observatory.telescope-jobs.notice-load-mismatch',
                'после загрузки в Ekos {{loaded}} заданий вместо {{planned}}',
                {
                    loaded: p.loaded,
                    planned: p.planned
                }
            )
        default:
            return notice.code
    }
}

/** The page of one job */
export const jobLink = (id: string): string => `/observatory/jobs/${id}`

/** What a job's status reads as: the stored one, or a state on top of it the site shows instead */
export type JobDisplayStatus = ApiModel.TelescopeJobStatus | 'paused' | 'cancelling'

/**
 * The status to show: a cancel asked for → "Отменяется"; a manager's pause of an approved or
 * queued job (`held`) → "Приостановлено" (stored as a flag, so the agent's sync contract stays
 * as it is — it already leaves held jobs out of the night's plan); otherwise the stored status.
 * A job the observatory is shooting reads "Снимается" even if paused meanwhile: the night goes on.
 */
export const displayStatus = (job: ApiModel.TelescopeJob): JobDisplayStatus => {
    if (job.cancelRequested && !isFinal(job.status)) {
        return 'cancelling'
    }

    if (job.held && (job.status === 'approved' || job.status === 'queued')) {
        return 'paused'
    }

    return job.status
}

/** A manager may pause it: approved or queued, not being cancelled */
export const canPause = (job: ApiModel.TelescopeJob): boolean =>
    (job.status === 'approved' || job.status === 'queued') && !job.cancelRequested

/** The job's name: the target, or "Патруль сверхновых · 10 нояб. 2026" for a patrol night */
export const jobTitle = (job: ApiModel.TelescopeJob, t: TFunction, locale: string): string =>
    job.patrol
        ? t('components.pages.observatory.telescope-jobs.patrol-title', 'Патруль сверхновых · {{date}}', {
              date: formatDate(job.patrol.night, locale)
          })
        : job.targetName

/** A patrol night: galaxies shot / planned, and its frames (every patrol frame is L) */
export const patrolDone = (job: ApiModel.TelescopeJob): { done: number; total: number; frames: number } => {
    const done = job.patrol?.visitsDone ?? 0

    return {
        done,
        frames: Object.values(job.progress).reduce((sum, n) => sum + (n ?? 0), 0),
        total: Math.max(job.patrol?.visitsPlanned ?? 0, done)
    }
}
