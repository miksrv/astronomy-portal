import React, { useState } from 'react'

import Image from 'next/image'

import defaultAvatar from '@/public/images/no-avatar.png'

import { getInitials } from './utils'

import styles from './styles.module.sass'

interface UserAvatarProps {
    src?: string
    name?: string
    size?: 'small' | 'medium' | 'large'
    className?: string
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ src, name, size = 'medium', className }) => {
    const [imgError, setImgError] = useState(false)

    const px = size === 'small' ? 28 : size === 'large' ? 128 : 32
    const sizeClass = size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium
    const rootClass = [styles.root, sizeClass, className].filter(Boolean).join(' ')

    if (src && !imgError) {
        return (
            <Image
                src={src}
                alt={''}
                width={px}
                height={px}
                className={rootClass}
                onError={() => setImgError(true)}
            />
        )
    }

    if (name) {
        return (
            <div
                className={[styles.initials, sizeClass, className].filter(Boolean).join(' ')}
                aria-label={name}
            >
                {getInitials(name)}
            </div>
        )
    }

    return (
        <Image
            src={defaultAvatar.src}
            alt={''}
            width={px}
            height={px}
            className={rootClass}
        />
    )
}
