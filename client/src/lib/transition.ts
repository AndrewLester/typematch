import { cubicOut } from 'svelte/easing';
import type { EasingFunction } from 'svelte/transition';

type HorizontalSlideParameters = {
    delay?: number;
    duration?: number;
    easing?: EasingFunction;
};

const defaultHorizontalSlideArguments = {
    delay: 0,
    duration: 400,
    easing: cubicOut,
};

// Copied from https://github.com/sveltejs/svelte/blob/b11f5b12f5055e363af0c03c1343fa721504f632/src/runtime/transition/index.ts#L103
export function horizontalSlide(
    node: HTMLElement,
    {
        delay = 0,
        duration = 250,
        easing = cubicOut,
    }: HorizontalSlideParameters = defaultHorizontalSlideArguments,
) {
    const style = getComputedStyle(node);
    const opacity = +style.opacity;
    const width = parseFloat(style.width);
    const padding_left = parseFloat(style.paddingLeft);
    const padding_right = parseFloat(style.paddingRight);
    const margin_left = parseFloat(style.marginLeft);
    const margin_right = parseFloat(style.marginRight);
    const border_left_width = parseFloat(style.borderLeftWidth);
    const border_right_width = parseFloat(style.borderRightWidth);

    return {
        delay,
        duration,
        easing,
        css: (t: number) =>
            'overflow: hidden;' +
            `opacity: ${Math.min(t * 20, 1) * opacity};` +
            `width: ${t * width}px;` +
            `padding-left: ${t * padding_left}px;` +
            `padding-right: ${t * padding_right}px;` +
            `margin-left: ${t * margin_left}px;` +
            `margin-right: ${t * margin_right}px;` +
            `border-left-width: ${t * border_left_width}px;` +
            `border-right-width: ${t * border_right_width}px;` +
            'white-space: nowrap;',
    };
}
