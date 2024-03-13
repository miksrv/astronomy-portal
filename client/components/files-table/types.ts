import { ApiModel } from '@/api'

export type TObjectSortable = keyof ApiModel.File.Item

export type TSortOrdering = 'ascending' | 'descending'
