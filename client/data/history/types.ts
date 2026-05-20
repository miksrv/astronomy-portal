export interface GalleryPhoto {
    url: string
    width: number
    height: number
    caption?: string
    caption_en?: string
}

export interface TextBlock {
    type: 'text'
    content: string
    content_en?: string
}

export interface GalleryBlock {
    type: 'gallery'
    photos: GalleryPhoto[]
}

export interface HeadingBlock {
    type: 'heading'
    text: string
    text_en?: string
}

export type ContentBlock = TextBlock | GalleryBlock

export interface ContentSection {
    heading?: string
    heading_en?: string
    blocks: ContentBlock[]
}

export interface HistoryChapter {
    slug: string
    date: string
    title: string
    title_en?: string
    summary: string
    summary_en?: string
    coverPhoto: string
    sections: ContentSection[]
}

export type HistoryChapterMeta = Omit<HistoryChapter, 'sections'>
