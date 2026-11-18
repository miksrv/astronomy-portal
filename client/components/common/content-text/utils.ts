import { PHOTO_FULL_WIDTH } from '@/utils/content'

export interface ContentSlide {
    src: string
    width: number
    height: number
    title: string
    alt: string
}

/**
 * The photos of a text as the lightbox's slides: the large size (`data-full`), the alt text for
 * the image (no caption, as in the galleries). The shape comes from the photo loaded in the row; a photo not loaded yet is 3:2.
 */
export const slidesOf = (article: HTMLElement): ContentSlide[] =>
    Array.from(article.querySelectorAll<HTMLImageElement>('.content-photo img')).map((image) => ({
        alt: image.alt,
        height: image.naturalWidth
            ? Math.round((image.naturalHeight / image.naturalWidth) * PHOTO_FULL_WIDTH)
            : Math.round((PHOTO_FULL_WIDTH * 2) / 3),
        src: image.dataset.full ?? image.src,
        title: '',
        width: PHOTO_FULL_WIDTH
    }))
