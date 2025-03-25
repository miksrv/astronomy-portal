import { API, HOST_API, HOST_IMG, SITE_LINK } from './api'
import * as ApiModel from './models'
import { useAppDispatch, useAppSelector } from './store'
import * as ApiType from './types'

import { APIMeteo } from '@/api/apiMeteo'

export { APIMeteo, ApiModel, ApiType, API, SITE_LINK, HOST_API, HOST_IMG, useAppDispatch, useAppSelector }
