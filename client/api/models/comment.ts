export interface Comment {
    id: string
    content: string
    rating?: number
    createdAt: string
    entityType?: string
    entityId?: string
    entity?: {
        title: string
        date: string
        coverFileName?: string
        coverFileExt?: string
    }
    author: {
        id: string
        name: string
        avatar?: string
    }
}

export type CommentEntityType = 'event' | 'photo'
