import React, { useCallback } from 'react'

import { useRouter } from 'next/router'

import { routerPath } from '@/utils/content'

/**
 * A click handler for server-rendered text (`ContentText`, the FAQ answers): a link to a page of
 * the site goes through the router like a `next/link`, without reloading the page. A link with a
 * modifier key, a new-tab link and an anchor on the same page stay the browser's.
 */
export const useContentLinks = () => {
    const router = useRouter()

    return useCallback(
        (event: React.MouseEvent<HTMLElement>): boolean => {
            const link = (event.target as HTMLElement).closest('a')
            const href = link?.getAttribute('href')

            if (
                !link ||
                !href?.startsWith('/') ||
                href.startsWith('//') ||
                link.target ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return false
            }

            event.preventDefault()
            void router.push(routerPath(href, router.locale))

            return true
        },
        [router]
    )
}
