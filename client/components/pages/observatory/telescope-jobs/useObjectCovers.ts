import { useMemo } from 'react'

import { API, ApiModel } from '@/api'
import { createThumbPhotoUrl } from '@/utils/photos'

/** Our objects' cover thumbnails by catalog name (one cached `GET /objects`, shared with the form) */
export const useObjectCovers = (): Record<string, string> => {
    const { data } = API.useObjectsGetListQuery()

    return useMemo(
        () =>
            Object.fromEntries(
                (data?.items ?? [])
                    .filter((item) => item.cover)
                    .map((item) => [item.name, createThumbPhotoUrl(item.cover as unknown as ApiModel.Photo)])
            ),
        [data]
    )
}
