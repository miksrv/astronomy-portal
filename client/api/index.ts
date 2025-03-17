import { APIMeteo } from '@/api/apiMeteo'

import * as ApiModel from './models'
import * as ApiType from './types'
import { API, HOST_API, HOST_IMG, SITE_LINK } from './api'
import { useAppDispatch, useAppSelector } from './store'

export {
    APIMeteo,
    ApiModel,
    ApiType,
    API,
    SITE_LINK,
    HOST_API,
    HOST_IMG,
    useAppDispatch,
    useAppSelector
}
