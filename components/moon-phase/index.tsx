import { Moment } from 'moment'
import React from 'react'
import SunCalc from 'suncalc'

import styles from './styles.module.sass'

type TMoonPhaseProps = {
    date: Moment
}

const phases: any = {
    /* 🌒 */ '0': '2',
    /* 🌒 */ '0.125': '3',
    /* 🌓 */ '0.25': '4',
    /* 🌔 */ '0.375': '5',
    /* 🌕 */ '0.5': '6',
    /* 🌖 */ '0.625': '7',
    /* 🌗 */ '0.75': '8',
    /* 🌘 */ '0.875': '9',
    /* 🌑 */ '1': '1'
}

const MoonPhase: React.FC<TMoonPhaseProps> = ({ date }) => {
    const phase: number =
        Math.round(SunCalc.getMoonIllumination(date).phase * 8) / 8
    const moonPhaseClass: string = 'moonPhase' + phases[phase.toString()]

    return <span className={styles[moonPhaseClass]} />
}

export default MoonPhase
