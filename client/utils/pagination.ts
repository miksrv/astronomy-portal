const LEFT_PAGE = 'LEFT'
const RIGHT_PAGE = 'RIGHT'

/**
 * Generates an array of numbers in a certain range and with a given step
 */
export const range = (from: number, to: number, step = 1): number[] => {
    let i = from
    const rangeArr: number[] = []

    while (i <= to) {
        rangeArr.push(i)
        i += step
    }

    return rangeArr
}

/**
 * Computes the page number array (with LEFT/RIGHT dot sentinels) for a given pagination state.
 */
export const computePageNumbers = (
    currentPage: number,
    totalPages: number,
    pageNeighbours: number
): Array<string | number> => {
    const totalNumbers = pageNeighbours * 2 + 3
    const totalBlocks = totalNumbers + 2

    if (totalPages > totalBlocks) {
        let pages: Array<string | number> = []

        const leftBound = currentPage - pageNeighbours
        const rightBound = currentPage + pageNeighbours
        const beforeLastPage = totalPages - 1

        const startPage = leftBound > 2 ? leftBound : 2
        const endPage = rightBound < beforeLastPage ? rightBound : beforeLastPage

        pages = range(startPage, endPage)

        const pagesCount = pages.length
        const singleSpillOffset = totalNumbers - pagesCount - 1

        const leftSpill = startPage > 2
        const rightSpill = endPage < beforeLastPage

        if (leftSpill && !rightSpill) {
            const extraPages = range(startPage - singleSpillOffset, startPage - 1)
            pages = [LEFT_PAGE, ...extraPages, ...pages]
        } else if (!leftSpill && rightSpill) {
            const extraPages = range(endPage + 1, endPage + singleSpillOffset)
            pages = [...pages, ...extraPages, RIGHT_PAGE]
        } else if (leftSpill && rightSpill) {
            pages = [LEFT_PAGE, ...pages, RIGHT_PAGE]
        }

        return [1, ...pages, totalPages]
    }

    return range(1, totalPages)
}
