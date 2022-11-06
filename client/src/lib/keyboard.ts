export function isNonLetterKey(key: string) {
    return [
        'Shift',
        'Alt',
        'Meta',
        'Control',
        'Tab',
        'CapsLock',
        'ArrowRight',
        'ArrowUp',
        'ArrowLeft',
        'ArrowDown',
    ].includes(key);
}
