import React from 'react'
import SunCalc from 'suncalc'

import styles from './styles.module.sass'

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

interface MoonPhaseProps {
    date: Date | string
}

const MoonPhase: React.FC<MoonPhaseProps> = ({ date }) => {
    const illumination = SunCalc.getMoonIllumination(new Date(date))
    const phase = Math.round(illumination.phase * 8) / 8
    const moonPhaseClass = 'moonPhase' + phases[phase.toString()]

    return <span className={styles[moonPhaseClass]} />
}

export default MoonPhase
