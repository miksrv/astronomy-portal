import { ApiModel } from '@/api'
import { StatusTone } from '@/components/ui'

/** Has a processed photo, has only raw frames, or was never shot */
export type ObjectStatus = 'photo' | 'frames' | 'none'

export const getObjectStatus = (object: {
    photosCount?: number
    frames?: number
    exposure?: number
    statistic?: ApiModel.Statistic
}): ObjectStatus =>
    object.photosCount
        ? 'photo'
        : object.frames || object.exposure || object.statistic?.frames || object.statistic?.exposure
          ? 'frames'
          : 'none'

/** Has a photo - done; frames only - in progress; never shot - nothing yet */
export const OBJECT_STATUS_TONES: Record<ObjectStatus, StatusTone> = {
    photo: 'positive',
    frames: 'accent',
    none: 'neutral'
}
