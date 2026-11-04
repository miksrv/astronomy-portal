/** An age in minutes in the largest unit that reads well: minutes under an hour, hours under a day */
export const splitAge = (minutes: number): { unit: 'minutes' | 'hours' | 'days'; count: number } =>
    minutes < 60
        ? { unit: 'minutes', count: Math.max(0, Math.floor(minutes)) }
        : minutes < 24 * 60
          ? { unit: 'hours', count: Math.floor(minutes / 60) }
          : { unit: 'days', count: Math.floor(minutes / (24 * 60)) }
