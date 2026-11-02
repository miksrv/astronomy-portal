import { getObservingVerdict, getWeatherMeter, getWeatherRange, getWeatherState, isGoodForecastNight } from './weather'

describe('weather', () => {
    it('rates a sensor against its limits, with a 25% warning margin', () => {
        expect(getWeatherRange('clouds', 0)).toBe('good')
        expect(getWeatherRange('clouds', 20)).toBe('good')
        expect(getWeatherRange('clouds', 45)).toBe('warning')
        expect(getWeatherRange('clouds', 80)).toBe('danger')
        expect(getWeatherRange('temperature', -30)).toBe('danger')
        expect(getWeatherRange('precipitation', 0)).toBe('good')
        expect(getWeatherRange('humidity', undefined)).toBeUndefined()
    })

    it('takes the worst sensor as the weather state', () => {
        expect(getWeatherState({ clouds: 0, humidity: 50, windSpeed: 2, temperature: 3 })).toBe('good')
        expect(getWeatherState({ clouds: 45, humidity: 50 })).toBe('warning')
        expect(getWeatherState({ clouds: 45, windSpeed: 12 })).toBe('danger')
        expect(getWeatherState(undefined)).toBeUndefined()
    })

    it('fills a meter within its scale', () => {
        expect(getWeatherMeter('humidity', 50)).toBe(50)
        expect(getWeatherMeter('clouds', 0)).toBe(4)
        expect(getWeatherMeter('windSpeed', 40)).toBe(100)
    })

    it('combines weather, darkness and the Moon into a verdict', () => {
        expect(getObservingVerdict('good', -30, -10, 0.9)).toEqual({ verdict: 'clear-dark', level: 'good' })
        expect(getObservingVerdict('good', -30, 20, 0.9)).toEqual({ verdict: 'clear-bright-moon', level: 'good' })
        expect(getObservingVerdict('good', -5, -10, 0)).toEqual({ verdict: 'waiting-darkness', level: 'warning' })
        expect(getObservingVerdict('warning', -30, -10, 0).verdict).toBe('borderline')
        expect(getObservingVerdict('danger', -30, -10, 0)).toEqual({ verdict: 'closed', level: 'danger' })
        expect(getObservingVerdict(undefined, -30, -10, 0).verdict).toBe('unknown')
    })

    it('picks clear, calm, dry nights from the forecast', () => {
        expect(isGoodForecastNight({ clouds: 5, precipitation: 0, windSpeedMax: 3 })).toBe(true)
        expect(isGoodForecastNight({ clouds: 71 })).toBe(false)
        expect(isGoodForecastNight({ clouds: 5, windSpeedMax: 12 })).toBe(false)
    })
})
