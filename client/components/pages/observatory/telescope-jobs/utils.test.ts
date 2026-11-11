import { TFunction } from 'i18next'

import { ApiModel } from '@/api'

import {
    canCancel,
    canPause,
    canRemove,
    displayStatus,
    formatDuration,
    jobTitle,
    noticeText,
    patrolDone,
    progressShare,
    totalSeconds
} from './utils'

const t = ((key: string, fallback: string, options?: Record<string, unknown>) =>
    fallback.replace(/{{(\w+)}}/g, (_, name: string) => String(options?.[name]))) as unknown as TFunction

const job = (overrides: Partial<ApiModel.TelescopeJob>): ApiModel.TelescopeJob =>
    ({
        cancelRequested: false,
        plan: [
            { count: 10, exposure: 300, filter: 'L' },
            { count: 4, exposure: 600, filter: 'H' }
        ],
        progress: {},
        status: 'queued',
        ...overrides
    }) as ApiModel.TelescopeJob

describe('totalSeconds', () => {
    it('sums exposure × count', () => {
        expect(totalSeconds(job({}).plan)).toBe(5400)
        expect(totalSeconds([])).toBe(0)
    })
})

describe('formatDuration', () => {
    it('reads as hours and minutes', () => {
        expect(formatDuration(5400, t)).toBe('1 ч 30 мин')
        expect(formatDuration(7200, t)).toBe('2 ч')
        expect(formatDuration(2700, t)).toBe('45 мин')
    })
})

describe('canCancel / canRemove', () => {
    it('cancels anything not final, once', () => {
        expect(canCancel(job({ status: 'pending' }))).toBe(true)
        expect(canCancel(job({ status: 'running' }))).toBe(true)
        expect(canCancel(job({ cancelRequested: true, status: 'running' }))).toBe(false)
        expect(canCancel(job({ status: 'completed' }))).toBe(false)
    })

    it('removes only what the observatory does not have, or what is final', () => {
        expect(canRemove(job({ status: 'pending' }))).toBe(true)
        expect(canRemove(job({ status: 'approved' }))).toBe(false)
        expect(canRemove(job({ status: 'queued' }))).toBe(false)
        expect(canRemove(job({ status: 'running' }))).toBe(false)
        expect(canRemove(job({ status: 'cancelled' }))).toBe(true)
    })
})

describe('progressShare', () => {
    it('counts frames up to the plan per filter', () => {
        expect(progressShare(job({ progress: { H: 9, L: 5 } }))).toBeCloseTo(9 / 14)
        expect(progressShare(job({ progress: {} }))).toBe(0)
    })
})

describe('noticeText', () => {
    it('translates the agent codes with their numbers', () => {
        expect(noticeText({ code: 'not-observable', group: 'bb', minutes: 20 }, t)).toBe(
            'широкополосные: видно только 20 мин этой ночью'
        )
        expect(noticeText({ code: 'foreign-jobs', names: ['NGC 7000', 'M 1'] }, t)).toBe(
            'в Scheduler есть задания, загруженные вручную: NGC 7000, M 1'
        )
        expect(noticeText({ code: 'no-focuser' }, t)).toBe('фокусер не подключён: шаг Focus не выполнится')
    })

    it('keeps plain text of older plans and an unknown code as is', () => {
        expect(noticeText('focuser not connected', t)).toBe('focuser not connected')
        expect(noticeText({ code: 'something-new' }, t)).toBe('something-new')
    })
})

describe('displayStatus', () => {
    it('shows a pause of an approved or queued job as its own status', () => {
        expect(displayStatus(job({ held: true, status: 'queued' }))).toBe('paused')
        expect(displayStatus(job({ held: true, status: 'approved' }))).toBe('paused')
        expect(displayStatus(job({ held: false, status: 'queued' }))).toBe('queued')
    })

    it('keeps "being shot" and final states over a pause; a cancel over everything active', () => {
        expect(displayStatus(job({ held: true, status: 'running' }))).toBe('running')
        expect(displayStatus(job({ held: true, status: 'completed' }))).toBe('completed')
        expect(displayStatus(job({ cancelRequested: true, held: true, status: 'queued' }))).toBe('cancelling')
    })

    it('lets a manager pause only approved or queued jobs not being cancelled', () => {
        expect(canPause(job({ status: 'queued' }))).toBe(true)
        expect(canPause(job({ status: 'approved' }))).toBe(true)
        expect(canPause(job({ status: 'running' }))).toBe(false)
        expect(canPause(job({ status: 'pending' }))).toBe(false)
        expect(canPause(job({ cancelRequested: true, status: 'queued' }))).toBe(false)
    })
})

describe('patrol nights', () => {
    const night = job({
        patrol: { night: '2026-11-10', visitsDone: 3, visitsPlanned: 5 },
        plan: [{ count: 5, exposure: 60, filter: 'L' }],
        progress: { L: 14 },
        source: 'patrol',
        targetName: 'Supernova patrol'
    })

    it("is named by its night, a visitor's job by its target", () => {
        expect(jobTitle(night, t, 'ru')).toMatch(/^Патруль сверхновых · 10 нояб/)
        expect(jobTitle(job({ patrol: null, targetName: 'M 101' }), t, 'ru')).toBe('M 101')
    })

    it('counts galaxies, never fewer planned than shot', () => {
        expect(patrolDone(night)).toStrictEqual({ done: 3, frames: 14, total: 5 })
        expect(
            patrolDone({ ...night, patrol: { night: '2026-11-10', visitsDone: 4, visitsPlanned: 2 } })
        ).toStrictEqual({
            done: 4,
            frames: 14,
            total: 4
        })
    })
})
