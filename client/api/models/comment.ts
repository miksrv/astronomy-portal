export type Comment = {
    id: string
    content: string
    rating?: number
    createdAt: string
    author: {
        id: string
        name: string
        avatar?: string
    }
}

export type CommentEntityType = 'event' | 'photo'
