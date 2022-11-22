import { writable, type Readable } from 'svelte/store';
import type { EditorStatisticsEvent } from './components/MultiplayerEditor.svelte';

export type PlayerStatisticType = 'wpm' | 'misses' | 'percent';

export interface PlayerStatistic {
    title: string;
    player: string;
    type: PlayerStatisticType;
    data: TimeseriesData[];
}

export interface TimeseriesData {
    group: string;
    date: string;
    value: number;
}

export interface StatisticsCollector
    extends Readable<PlayerStatistic[] | undefined> {
    onCollect(event: CustomEvent<EditorStatisticsEvent>): void;
    reset(): void;
}

export class SingleplayerStatisticsCollector implements StatisticsCollector {
    store = writable<PlayerStatistic[]>([
        {
            title: 'WPM',
            player: 'You',
            type: 'wpm',
            data: [],
        },
        {
            title: 'Misses',
            player: 'You',
            type: 'misses',
            data: [],
        },
        {
            title: 'Percent',
            player: 'You',
            type: 'percent',
            data: [],
        },
    ]);

    onCollect(event: CustomEvent<EditorStatisticsEvent>) {
        const editorInput = event.detail;

        if (!editorInput.lcp) return;

        this.store.update((statistics) => {
            const [wpm, misses, percent] = statistics;

            const date = new Date().toISOString();

            wpm.data.push({
                date,
                group: 'WPM',
                value: editorInput.wpm,
            });
            misses.data.push({
                date,
                group: 'Misses',
                value: editorInput.incorrect.length,
            });
            percent.data.push({
                date,
                group: 'Percent',
                value: editorInput.percent,
            });

            return statistics;
        });
    }

    reset() {
        this.store.update((statistics) => {
            for (const statistic of statistics) {
                statistic.data = [];
            }

            return statistics;
        });
    }

    subscribe = this.store.subscribe;
}
