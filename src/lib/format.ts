export const formatDuration = (seconds :number) => {
    const intervals = {
        hours: Math.trunc(seconds/3600),
        minutes: Math.trunc(seconds/60)%60,
        seconds: Math.trunc(seconds%60),
    }
    return `${intervals.hours.toString().padStart(2, '0')}:${intervals.minutes.toString().padStart(2, '0')}:${intervals.seconds.toString().padStart(2, '0')}`
}
