const zeroPad = (number: number, digits: number): string => {
    const numberStr = number.toString();

    if (numberStr.length === digits) {
        return numberStr;
    }

    return numberStr.padStart(digits, '0');
};

export const timerTimeFormat = (millis: number) => {
    const totalSeconds = Math.trunc(millis / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.trunc(totalSeconds / 60);

    const minutesPadded = zeroPad(minutes, 1);
    const secondsPadded = zeroPad(seconds, 2);
    return `${minutesPadded}:${secondsPadded}`;
};
