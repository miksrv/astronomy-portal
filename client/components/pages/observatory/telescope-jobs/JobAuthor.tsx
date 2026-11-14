import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { UserAvatar } from '@/components/ui/user-avatar/UserAvatar'
import { HOST_IMG } from '@/utils/constants'

import styles from './styles.module.sass'

interface JobAuthorProps {
    job: ApiModel.TelescopeJob
    /** `tiny` in a card's meta line of icons */
    avatarSize?: 'tiny' | 'small'
    className?: string
}

/** Who a job is from: the visitor's avatar and name, or the observatory's own supernova patrol */
export const JobAuthor: React.FC<JobAuthorProps> = ({ job, avatarSize = 'small', className }) => {
    const { t } = useTranslation()

    if (!job.author) {
        return (
            <span className={cn(styles.jobAuthor, className)}>
                <Icon
                    name={'Search'}
                    aria-hidden
                />
                {t('components.pages.observatory.telescope-jobs.patrol-author', 'Патруль сверхновых')}
            </span>
        )
    }

    return (
        <span className={cn(styles.jobAuthor, className)}>
            <UserAvatar
                size={avatarSize}
                name={job.author.name}
                src={job.author.avatar ? `${HOST_IMG}/users/${job.author.id}/${job.author.avatar}` : undefined}
            />
            {job.author.name}
        </span>
    )
}
