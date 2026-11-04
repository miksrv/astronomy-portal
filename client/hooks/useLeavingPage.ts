import { useEffect, useState } from 'react'

import { useRouter } from 'next/router'

/**
 * True while the page is on its way to another item of the same section (`/photos/:id`,
 * `/objects/:name`): its data comes from the server first, and the old picture should be taken
 * off the screen meanwhile, not left there to be mistaken for the next one. A shallow change of
 * the query (filters, the compare slider) or a link to the same item doesn't count.
 *
 * @param section the path segment before the id: `photos`, `objects`
 * @param currentId the item shown now
 */
export const useLeavingPage = (section: string, currentId: string): boolean => {
    const router = useRouter()
    const [leaving, setLeaving] = useState(false)

    useEffect(() => {
        // With the locale prefix, if any: `/en/photos/:id`
        const pattern = new RegExp(`/${section}/([^/?#]+)`)

        const handleStart = (url: string, { shallow }: { shallow: boolean }) => {
            const id = pattern.exec(url)?.[1]
            // `/objects/form?id=…` is the editor of this item, not another one
            setLeaving(!shallow && !!id && id !== 'form' && decodeURIComponent(id) !== currentId)
        }
        const handleEnd = () => setLeaving(false)

        router.events.on('routeChangeStart', handleStart)
        router.events.on('routeChangeComplete', handleEnd)
        router.events.on('routeChangeError', handleEnd)

        return () => {
            router.events.off('routeChangeStart', handleStart)
            router.events.off('routeChangeComplete', handleEnd)
            router.events.off('routeChangeError', handleEnd)
        }
    }, [router.events, section, currentId])

    return leaving
}
