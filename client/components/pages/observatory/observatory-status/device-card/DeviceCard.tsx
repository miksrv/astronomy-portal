import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { StatusBadge } from '@/components/ui'

import { DEVICE_ROLE_ICONS } from '../constants'
import { formatDriver, getDeviceHealth, getPercent } from '../utils'

import styles from './styles.module.sass'

export const useRoleLabels = (): Record<ApiModel.DeviceRole, string> => {
    const { t } = useTranslation()

    return {
        mount: t('components.pages.observatory.status.role-mount', 'Монтировка'),
        camera: t('components.pages.observatory.status.role-camera', 'Камера'),
        guider: t('components.pages.observatory.status.role-guider', 'Гид-камера'),
        filter: t('components.pages.observatory.status.role-filter', 'Фильтры'),
        focuser: t('components.pages.observatory.status.role-focuser', 'Фокусер'),
        roof: t('components.pages.observatory.status.role-roof', 'Крыша'),
        weather: t('components.pages.observatory.status.role-weather', 'Погода'),
        watchdog: t('components.pages.observatory.status.role-watchdog', 'Сторож'),
        other: t('components.pages.observatory.status.role-other', 'Устройство')
    }
}

interface DeviceCardProps {
    deviceRole: ApiModel.DeviceRole
    /** The device's name; the role's name when the agent did not list the device */
    name?: string | null
    connected: boolean
    driver?: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert: the card turns orange and lists them */
    alerts?: string[]
    /** The link to the observatory is down: the numbers are the last known ones */
    stale?: boolean
    /** An extra badge next to the connection (what the device is doing now) */
    state?: React.ReactNode
    children?: React.ReactNode
}

/**
 * One device of the observatory: its name, role, connection and driver in the header, its
 * readings below. A disconnected device is a muted card with no readings.
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({
    deviceRole: role,
    name,
    connected,
    driver,
    alerts,
    stale,
    state,
    children
}) => {
    const { t } = useTranslation()
    const roleLabels = useRoleLabels()

    const driverLabel = formatDriver(driver)
    const health = getDeviceHealth(connected, alerts)
    const roleLabel = roleLabels[role] ?? roleLabels.other
    const title = name || roleLabel

    return (
        <section
            className={cn(
                styles.deviceCard,
                !connected && styles.disconnected,
                health === 'error' && styles.error,
                health === 'warning' && styles.warning,
                stale && styles.stale
            )}
        >
            <header className={styles.head}>
                <h3 className={styles.title}>
                    <Icon name={DEVICE_ROLE_ICONS[role] ?? DEVICE_ROLE_ICONS.other} />
                    <span className={styles.name}>{title}</span>
                    {title !== roleLabel && <span className={styles.role}>{roleLabel}</span>}
                </h3>
                <div className={styles.badges}>
                    {connected && state}
                    <StatusBadge
                        tone={health === 'error' ? 'danger' : health === 'warning' ? 'warning' : 'positive'}
                        dot={true}
                    >
                        {health === 'error'
                            ? t('components.pages.observatory.status.badge-disconnected', 'Не подключено')
                            : health === 'warning'
                              ? t('components.pages.observatory.status.badge-warning', 'Предупреждение')
                              : t('components.pages.observatory.status.badge-connected', 'Подключено')}
                    </StatusBadge>
                </div>
                {driverLabel && <p className={styles.driver}>{driverLabel}</p>}
            </header>

            {health === 'warning' && !!alerts?.length && (
                <p className={styles.alerts}>
                    {t('components.pages.observatory.status.alerts', 'INDI сообщает об ошибке: {{list}}', {
                        list: alerts.join(', ')
                    })}
                </p>
            )}

            {connected && children}
        </section>
    )
}

interface FactProps {
    label: string
    children: React.ReactNode
    /** A line of detail under the value */
    note?: React.ReactNode
}

/** A reading: the label over its value */
export const Fact: React.FC<FactProps> = ({ label, children, note }) => (
    <div className={styles.fact}>
        <dt>{label}</dt>
        <dd>
            {children}
            {note && <small>{note}</small>}
        </dd>
    </div>
)

/** The readings of a card in a responsive grid */
interface FactsProps {
    children: React.ReactNode
    className?: string
    /** Three equal columns across the card (two on narrow cards) instead of as many as fit */
    columns?: 3
}

export const Facts: React.FC<FactsProps> = ({ children, className, columns }) => (
    <dl className={cn(styles.facts, columns === 3 && styles.three, className)}>{children}</dl>
)

interface MeterProps {
    /** Share of the whole, percent */
    percent: number
    label: string
    tone?: 'accent' | 'positive' | 'warning'
}

/** A thin bar for a reading against its limit (the cooler's power, the focuser's travel) */
export const Meter: React.FC<MeterProps> = ({ percent, label, tone = 'accent' }) => (
    <div
        className={cn(styles.meter, styles[tone])}
        role={'meter'}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={getPercent(percent, 100)}
    >
        <span style={{ width: `${getPercent(percent, 100)}%` }} />
    </div>
)

/** A short muted text in a card: "no data" lines */
export const CardNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className={styles.note}>{children}</p>
)
