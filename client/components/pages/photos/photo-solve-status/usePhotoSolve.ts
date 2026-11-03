import { useEffect, useRef } from 'react'

import { useRouter } from 'next/router'

import { API, ApiModel } from '@/api'
import { getErrorMessage } from '@/utils/errors'

/** Seconds between the steps of a running solve */
const STEP_INTERVAL = 8_000

export interface PhotoSolveState {
    status?: ApiModel.PhotoAstrometry['status']
    /** A solve is running: the browser steps it every few seconds */
    inProgress: boolean
    /** The service's or the transport's reason, when the last solve failed */
    failure?: string
    /** No solve has completed yet: the action starts the first one rather than another one */
    unsolved: boolean
    /** The state is not known yet, or a step is on its way to the server: nothing to start */
    busy: boolean
    /** Start a solve over */
    start: () => void
}

/**
 * The editor's plate solve of a photo. A solve runs as steps the browser asks for one after
 * another (upload, then "is it done yet?"), so a photo gets solved while the editor looks at its
 * page right after the upload - no background worker. When it completes, the page is reloaded in
 * place to show the labels and the grid. Lives on the page (not in the "⋯" menu that starts it),
 * since the steps go on while the menu is closed.
 */
export const usePhotoSolve = (photoId: string, enabled: boolean): PhotoSolveState => {
    const router = useRouter()

    // `currentData` (not `data`): the page stays mounted between photos, and the previous photo's
    // state must not drive a step on this one
    const {
        currentData: data,
        error,
        isLoading
    } = API.usePhotosGetAstrometryQuery(photoId, {
        skip: !enabled
    })
    const [solve, mutation] = API.usePhotosSolveMutation()

    // The page stays mounted between photos, and so does the mutation: its answer, error and
    // pending flag count only for the photo the last step was sent for
    const ownStep = mutation.originalArgs?.id === photoId
    const stepped = ownStep ? mutation.data : undefined
    const stepError = ownStep ? mutation.error : undefined
    const stepping = ownStep && mutation.isLoading

    // The step's answer is newer than the query's cache until the latter refetches
    const current: ApiModel.PhotoAstrometry | undefined = stepped ?? data
    const status = current?.status
    // A step that failed to reach the server ends the chain: the action comes back for a retry
    const inProgress = enabled && (status === 'pending' || status === 'solving') && !stepError

    // The photo whose solve was running: a solve that ends on it reloads the page, one that was
    // running on the previous photo does not
    const solvingPhoto = useRef<string | null>(null)

    useEffect(() => {
        if (!inProgress) {
            if (solvingPhoto.current === photoId && status === 'success') {
                void router.replace(router.asPath, undefined, { scroll: false })
            }

            solvingPhoto.current = null

            return
        }

        solvingPhoto.current = photoId
        const timer = window.setTimeout(() => void solve({ id: photoId }), STEP_INTERVAL)

        return () => window.clearTimeout(timer)
        // `current` changes with every step's answer, which is what restarts the timer
    }, [inProgress, status, current, photoId])

    return {
        status,
        inProgress,
        failure:
            status === 'failed' ? (current?.error ?? undefined) : stepError ? getErrorMessage(stepError) : undefined,
        unsolved: (!isLoading && !current && !!error) || status === 'failed' || !!stepError,
        busy: isLoading || stepping,
        start: () => void solve({ id: photoId, restart: true })
    }
}
