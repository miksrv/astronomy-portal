import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'
import { fallbackToMediumPhoto } from '@/utils/photos'

import styles from './styles.module.sass'

interface JobCoverProps {
    /** The square thumbnail of our object's newest photo, when the target is in the catalog */
    src?: string
    plan: ApiModel.TelescopePlanRow[]
    size?: 'small' | 'medium'
    className?: string
}

/**
 * The picture of a job: our photo of the object, or — for a target we have never shot — a plate
 * tinted with the colours of the job's filters, so a list of jobs still reads at a glance.
 */
export const JobCover: React.FC<JobCoverProps> = ({ src, plan, size = 'medium', className }) => {
    const colors = plan.map((row) => getFilterColor(row.filter)).filter(Boolean)
    const background =
        colors.length > 1 ? `linear-gradient(135deg, ${colors.join(', ')})` : (colors[0] ?? 'var(--surface-3)')

    return (
        <div
            className={cn(styles.cover, size === 'small' && styles.coverSmall, className)}
            aria-hidden={true}
        >
            {src ? (
                // A plain <img>: the 160 px square thumb is already the right source (as the catalog does)
                // eslint-disable-next-line next/no-img-element
                <img
                    src={src}
                    alt={''}
                    width={160}
                    height={160}
                    loading={'lazy'}
                    decoding={'async'}
                    onError={fallbackToMediumPhoto}
                />
            ) : (
                <span
                    className={styles.coverTint}
                    style={{ background }}
                >
                    <Icon name={'StarFilled'} />
                </span>
            )}
        </div>
    )
}
