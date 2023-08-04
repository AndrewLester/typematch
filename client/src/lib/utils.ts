type ClickOutsideHandler = (element: HTMLElement) => void;

export function clickOutside(
    element: HTMLElement,
    handler: ClickOutsideHandler,
) {
    const onClick = (event: MouseEvent) => {
        if (!element.contains(event.target as HTMLElement)) {
            handler(event.target as HTMLElement);
        }
    };

    document.addEventListener('click', onClick);

    return {
        destroy() {
            document.removeEventListener('click', onClick);
        },
        update(newHandler: ClickOutsideHandler) {
            handler = newHandler;
        },
    };
}
