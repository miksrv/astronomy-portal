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
    /** Width of one slide (`--slide-size`), e.g. `190px`; one slide per view by default */
    slideSize?: string
    children?: React.ReactNode
    className?: string
    containerClassName?: string
}

export const Carousel: React.FC<CarouselProps> = ({
    options,
    autoScroll,
    slideSize,
    children,
    className,
    containerClassName
}) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(options, [
        ...(autoScroll ? [AutoScroll({ playOnInit: true, speed: 0.5 })] : [])
    ])

    const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(
        emblaApi as EmblaCarouselType
    )

    // Auto-scroll owns the scroll animation while it plays, so an arrow click
    // would be swallowed: the arrows stop it first, like a drag does
    const stopAutoScroll = () => emblaApi?.plugins()?.autoScroll?.stop()

    return (
        <div
            className={cn(styles.carousel, className)}
            style={slideSize ? ({ '--slide-size': slideSize } as React.CSSProperties) : undefined}
        >
            <div
                ref={emblaRef}
                className={styles.viewport}
            >
                <div className={cn(styles.container, containerClassName)}>{children}</div>
            </div>

            <div className={styles.buttonsContainer}>
                <PrevButton
                    onClick={() => {
                        stopAutoScroll()
                        onPrevButtonClick()
                    }}
                    disabled={prevBtnDisabled}
                />
                <NextButton
                    onClick={() => {
                        stopAutoScroll()
                        onNextButtonClick()
                    }}
                    disabled={nextBtnDisabled}
                />
            </div>
        </div>
    )
}
