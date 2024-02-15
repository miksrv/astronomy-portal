import { range } from '@/functions/helpers'
import classNames from 'classnames'
import Link from 'next/link'
import React, { useMemo } from 'react'
import { Icon } from 'semantic-ui-react'

import styles from './styles.module.sass'

const LEFT_PAGE = 'LEFT'
const RIGHT_PAGE = 'RIGHT'

interface PaginationProps {
    currentPage?: number
    totalPostCount?: number
    linkPart?: string
    perPage?: number
    neighbours?: number
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage = 1,
    totalPostCount = 0,
    linkPart,
    perPage = 4,
    neighbours = 2
}) => {
    const pageNeighbours = Math.max(0, Math.min(neighbours, 2))
    const totalPages = Math.ceil(totalPostCount / perPage)

    const link = `/${linkPart}`

    const fetchPageNumbers: (string | number)[] = useMemo(() => {
        const totalNumbers = pageNeighbours * 2 + 3
        const totalBlocks = totalNumbers + 2

        if (totalPages > totalBlocks) {
            let pages = []

            const leftBound = currentPage - pageNeighbours
            const rightBound = currentPage + pageNeighbours
            const beforeLastPage = totalPages - 1

            const startPage = leftBound > 2 ? leftBound : 2
            const endPage =
                rightBound < beforeLastPage ? rightBound : beforeLastPage

            pages = range(startPage, endPage)

            const pagesCount = pages.length
            const singleSpillOffset = totalNumbers - pagesCount - 1

            const leftSpill = startPage > 2
            const rightSpill = endPage < beforeLastPage

            const leftSpillPage = LEFT_PAGE
            const rightSpillPage = RIGHT_PAGE

            if (leftSpill && !rightSpill) {
                const extraPages = range(
                    startPage - singleSpillOffset,
                    startPage - 1
                )
                pages = [leftSpillPage, ...extraPages, ...pages]
            } else if (!leftSpill && rightSpill) {
                const extraPages = range(
                    endPage + 1,
                    endPage + singleSpillOffset
                )
                pages = [...pages, ...extraPages, rightSpillPage]
            } else if (leftSpill && rightSpill) {
                pages = [leftSpillPage, ...pages, rightSpillPage]
            }

            return [1, ...pages, totalPages]
        }

        return range(1, totalPages)
    }, [currentPage, pageNeighbours, totalPages])

    return (
        <nav
            aria-label={'Pages Pagination'}
            className={styles.pagination}
        >
            {fetchPageNumbers.map((page) => (
                <Link
                    className={classNames(
                        styles.item,
                        currentPage === page ? styles.active : undefined
                    )}
                    href={
                        page === RIGHT_PAGE
                            ? `${link}/${currentPage + 1}`
                            : page === LEFT_PAGE
                              ? `${link}/${currentPage - 1}`
                              : page === 1
                                ? link
                                : `${link}/${page}`
                    }
                    title={
                        page === RIGHT_PAGE
                            ? 'Следующая страница'
                            : page === LEFT_PAGE
                              ? 'Предыдущая страница'
                              : `Страница - ${page}`
                    }
                    key={page}
                >
                    {page === RIGHT_PAGE ? (
                        <Icon
                            name={'angle right'}
                            fitted={true}
                        />
                    ) : page === LEFT_PAGE ? (
                        <Icon
                            name={'angle left'}
                            fitted={true}
                        />
                    ) : (
                        <>{page}</>
                    )}
                </Link>
            ))}
        </nav>
    )
}

export default Pagination
