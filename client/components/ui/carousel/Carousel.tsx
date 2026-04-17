import React from 'react'
import { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel'
import AutoScroll from 'embla-carousel-auto-scroll'
import useEmblaCarousel from 'embla-carousel-react'
import { cn } from 'simple-react-ui-kit'

import { NextButton, PrevButton, usePrevNextButtons } from './CarouselButtons'

import styles from './styles.module.sass'

interface CarouselProps {
    options?: EmblaOptionsType
    autoScroll?: boolean
    children?: React.ReactNode
    className?: string
    containerClassName?: string
}

export const Carousel: React.FC<CarouselProps> = ({ options, autoScroll, children, className, containerClassName }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(options, [
        ...(autoScroll ? [AutoScroll({ playOnInit: true, speed: 0.5 })] : [])
    ])

    const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(
        emblaApi as EmblaCarouselType
    )

    return (
        <div className={cn(styles.carousel, className)}>
            <div
                ref={emblaRef}
                className={styles.viewport}
            >
                <div className={cn(styles.container, containerClassName)}>{children}</div>
            </div>

            <div className={styles.buttonsContainer}>
                <PrevButton
                    onClick={onPrevButtonClick}
                    disabled={prevBtnDisabled}
                />
                <NextButton
                    onClick={onNextButtonClick}
                    disabled={nextBtnDisabled}
                />
            </div>
        </div>
    )
}
