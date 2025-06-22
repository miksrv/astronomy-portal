import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { getMoonPhase } from '@/tools/moon'

import styles from './styles.module.sass'

const phases: { [key: string]: string } = {
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
    date?: string | Date
}

const MoonPhaseIcon: React.FC<MoonPhaseProps> = ({ date }) => {
    if (!date) {
        return ''
    }

    const phase = getMoonPhase(new Date(date))
    const moonPhaseClass = 'phase' + phases[phase.toString()]

    return <span className={cn(styles.moonPhaseIcon, styles[moonPhaseClass])} />
}

export default MoonPhaseIcon
