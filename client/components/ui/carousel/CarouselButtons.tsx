import React, { PropsWithChildren, useCallback, useEffect, useState } from 'react'
import { EmblaCarouselType } from 'embla-carousel'
import { cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

type UsePrevNextButtonsType = {
    prevBtnDisabled: boolean
    nextBtnDisabled: boolean
    onPrevButtonClick: () => void
    onNextButtonClick: () => void
}

export const usePrevNextButtons = (emblaApi: EmblaCarouselType | undefined): UsePrevNextButtonsType => {
    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

    const onPrevButtonClick = useCallback(() => {
        if (!emblaApi) {
            return
        }
        emblaApi.scrollPrev()
    }, [emblaApi])

    const onNextButtonClick = useCallback(() => {
        if (!emblaApi) {
            return
        }
        emblaApi.scrollNext()
    }, [emblaApi])

    const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
        setPrevBtnDisabled(!emblaApi.canScrollPrev())
        setNextBtnDisabled(!emblaApi.canScrollNext())
    }, [])

    useEffect(() => {
        if (!emblaApi) {
            return
        }

        onSelect(emblaApi)
        emblaApi.on('reInit', onSelect)
        emblaApi.on('select', onSelect)
    }, [emblaApi, onSelect])

    return {
        nextBtnDisabled,
        onNextButtonClick,
        onPrevButtonClick,
        prevBtnDisabled
    }
}

type PropType = PropsWithChildren<
    React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
>

export const PrevButton: React.FC<PropType> = ({ children, ...restProps }) => {
    const { t } = useTranslation()

    return (
        <button
            className={cn(styles.arrowButton, styles.arrowButtonLeft)}
            type={'button'}
            aria-label={t('components.ui.carousel.prev', 'Предыдущий слайд')}
            {...restProps}
        >
            <span>
                <Icon name={'KeyboardLeft'} />
                {children}
            </span>
        </button>
    )
}

export const NextButton: React.FC<PropType> = ({ children, ...restProps }) => {
    const { t } = useTranslation()

    return (
        <button
            className={cn(styles.arrowButton, styles.arrowButtonRight)}
            type={'button'}
            aria-label={t('components.ui.carousel.next', 'Следующий слайд')}
            {...restProps}
        >
            <span>
                <Icon name={'KeyboardRight'} />
                {children}
            </span>
        </button>
    )
}
