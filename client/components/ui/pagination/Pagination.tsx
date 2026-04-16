import React, { useMemo } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Link from 'next/link'

import { encodeQueryData } from '@/api'
import { computePageNumbers } from '@/utils/pagination'

import styles from './styles.module.sass'

const LEFT_PAGE = 'LEFT'
const RIGHT_PAGE = 'RIGHT'

export interface PaginationProps<T> {
    currentPage?: number
    totalItemsCount?: number
    linkPart?: string
    captionPage?: string
    captionNextPage?: string
    captionPrevPage?: string
    urlParam?: T
    perPage?: number
    neighbours?: number
    disableScroll?: boolean
    hideIfOnePage?: boolean
    hideArrows?: boolean
    onChangePage?: (page: number) => void
}

export const Pagination = <T,>({
    currentPage = 1,
    totalItemsCount = 0,
    linkPart,
    captionPage,
    captionNextPage,
    captionPrevPage,
    urlParam,
    disableScroll,
    hideIfOnePage,
    hideArrows,
    perPage = 20,
    neighbours = 2,
    onChangePage
}: PaginationProps<T>) => {
    const pageNeighbours = Math.max(0, Math.min(neighbours, 2))
    const totalPages = Math.ceil(totalItemsCount / perPage)

    const fetchPageNumbers: Array<string | number> = useMemo(
        () => computePageNumbers(currentPage, totalPages, pageNeighbours),
        [currentPage, pageNeighbours, totalPages]
    )

    if (hideIfOnePage && totalPages <= 1) {
        return <></>
    }

    const getTargetPage = (page: string | number): number => {
        if (page === RIGHT_PAGE) {
            return currentPage + 1
        }
        if (page === LEFT_PAGE) {
            return currentPage - 1
        }
        return Number(page)
    }

    const getTitle = (page: string | number): string => {
        if (page === RIGHT_PAGE) {
            return captionNextPage ?? 'Next page'
        }
        if (page === LEFT_PAGE) {
            return captionPrevPage ?? 'Previous page'
        }
        return `${captionPage ?? 'Page'} - ${page}`
    }

    const getContent = (page: string | number) => {
        if (page === RIGHT_PAGE) {
            return <Icon name={'KeyboardRight'} />
        }
        if (page === LEFT_PAGE) {
            return <Icon name={'KeyboardLeft'} />
        }
        return <>{page}</>
    }

    const visiblePages = fetchPageNumbers.filter((page) =>
        !hideArrows ? true : page !== RIGHT_PAGE && page !== LEFT_PAGE
    )

    // Callback mode: render <button> elements — no Link weirdness with hash hrefs
    if (onChangePage) {
        return (
            <nav
                aria-label={'Pages Pagination'}
                className={styles.pagination}
            >
                {visiblePages.map((page) => (
                    <button
                        key={page}
                        type={'button'}
                        title={getTitle(page)}
                        className={cn(styles.item, currentPage === page ? styles.active : undefined)}
                        onClick={() => onChangePage(getTargetPage(page))}
                    >
                        {getContent(page)}
                    </button>
                ))}
            </nav>
        )
    }

    // Link mode: render Next.js <Link> elements for URL-based navigation
    const link = linkPart ? `/${linkPart}` : '/'

    return (
        <nav
            aria-label={'Pages Pagination'}
            className={styles.pagination}
        >
            {visiblePages.map((page) => {
                const targetPage = getTargetPage(page)
                const href =
                    targetPage === 1
                        ? `${link}${encodeQueryData({ ...urlParam, page: undefined })}`
                        : `${link}${encodeQueryData({ ...urlParam, page: targetPage })}`

                return (
                    <Link
                        key={page}
                        scroll={!disableScroll}
                        className={cn(styles.item, currentPage === page ? styles.active : undefined)}
                        href={href}
                        title={getTitle(page)}
                    >
                        {getContent(page)}
                    </Link>
                )
            })}
        </nav>
    )
}
