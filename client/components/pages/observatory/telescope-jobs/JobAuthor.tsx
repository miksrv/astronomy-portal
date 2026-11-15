import React from 'react'
import { cn } from 'simple-react-ui-kit'

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

/** Who a job is from: the visitor's avatar and name */
export const JobAuthor: React.FC<JobAuthorProps> = ({ job, avatarSize = 'small', className }) => {
    // Every job has an author; a deleted account leaves none to show
    if (!job.author) {
        return null
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
