import React from 'react'
import { EmblaOptionsType } from 'embla-carousel'
import AutoScroll from 'embla-carousel-auto-scroll'
import useEmblaCarousel from 'embla-carousel-react'

import { NextButton, PrevButton, usePrevNextButtons } from './CarouselButtons'
import styles from './styles.module.sass'

interface CarouselProps {
    options?: EmblaOptionsType
    autoScroll?: boolean
    children?: any
}

const Carousel: React.FC<CarouselProps> = ({ options, autoScroll, children }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(options, [
        ...(autoScroll ? [AutoScroll({ playOnInit: true, speed: 0.5 })] : [])
    ])

    const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(
        emblaApi as any
    )

    return (
        <div className={styles.carousel}>
            <div
                ref={emblaRef}
                className={styles.viewport}
            >
                <div className={styles.container}>{children}</div>
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

export default Carousel
