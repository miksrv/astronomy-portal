import { useMemo } from 'react'

import { useNow } from '@/hooks/useNow'
import { getNight, getVisibility, isMovingObject } from '@/utils/visibility'

import { VISIBILITY_REFRESH_MS } from './constants'
import { CatalogObject, CatalogVisibility } from './types'

/** Tonight's best altitude of every object; `undefined` on the server and until hydrated */
export const useCatalogVisibility = (objects: CatalogObject[]): CatalogVisibility | undefined => {
    const now = useNow(VISIBILITY_REFRESH_MS)

    return useMemo(() => {
        if (!now) {
            return undefined
        }

        const night = getNight(now)

        return Object.fromEntries(
            objects.map(({ name, ra, dec, categories }) => [
                name,
                ra == null || dec == null || isMovingObject(categories) ? null : getVisibility(ra, dec, night)
            ])
        )
    }, [now, objects])
}
