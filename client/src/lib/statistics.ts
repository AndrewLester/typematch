import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { countWords } from './passages';

export type PlayerStatisticType = 'timeseries' | 'numeric';

export interface TimeseriesPlayerStatistic {
    title: string;
    player: string;
    type: 'timeseries';
    data: TimeseriesData[];
}

export interface NumericPlayerStatistic {
    title: string;
    player: string;
    type: 'numeric';
    data: number;
}

export type PlayerStatistic =
    | TimeseriesPlayerStatistic
    | NumericPlayerStatistic;

export interface TimeseriesData {
    group: string;
    date: string;
    value: number;
    percent: number;
}

export type EditorStatisticsEvent = {
    lcp: string;
    wpm?: number;
    incorrect?: string;
    percent: number;
};

export interface StatisticsCollector<Statistics> extends Readable<Statistics> {
    begin(passage: string, startTime: Date): void;
    end(endTime: Date): void;
    onCollect(event: EditorStatisticsEvent): void;
    reset(): void;
}

export type SingleplayerStatistics = {
    wpm: TimeseriesPlayerStatistic;
    misses: TimeseriesPlayerStatistic;
    percent: TimeseriesPlayerStatistic;
    avgWPM: NumericPlayerStatistic;
    peakWPM: NumericPlayerStatistic;
};

export type MultiplayerStatistics = Record<string, SingleplayerStatistics>;

const defaultSingleplayeStats: SingleplayerStatistics = {
    wpm: {
        title: 'WPM',
        player: 'You',
        type: 'timeseries',
        data: [],
    },
    misses: {
        title: 'Misses',
        player: 'You',
        type: 'timeseries',
        data: [],
    },
    percent: {
        title: 'Percent',
        player: 'You',
        type: 'timeseries',
        data: [],
    },
    avgWPM: {
        title: 'Average WPM',
        player: 'You',
        type: 'numeric',
        data: 0,
    },
    peakWPM: {
        title: 'Peak WPM',
        player: 'You',
        type: 'numeric',
        data: 0,
    },
};

export class SingleplayerStatisticsCollector
    implements StatisticsCollector<SingleplayerStatistics>
{
    store: Writable<SingleplayerStatistics>;
    passage?: string;
    startTime?: Date;
    endTime?: Date;
    subscribe: typeof this.store.subscribe;

    constructor(
        initialValue?: SingleplayerStatistics,
    ) {
        if (!initialValue) {
            initialValue = JSON.parse(JSON.stringify(defaultSingleplayeStats));
        }

        this.store = writable<SingleplayerStatistics>(initialValue!);
        this.subscribe = this.store.subscribe;
    }

    begin(passage: string, startTime: Date) {
        this.passage = passage;
        this.startTime = startTime;
    }

    end(endTime: Date) {
        if (!this.passage || !this.startTime) return;

        this.endTime = endTime;

        this.store.update((statistics) => {
            const words = countWords(this.passage!);
            const time =
                (this.endTime!.getTime() - this.startTime!.getTime()) /
                1000 /
                60;

            statistics.avgWPM.data = words / time;
            statistics.peakWPM.data = statistics.wpm.data.reduce(
                (prev, cur) => (prev > cur.value ? prev : cur.value),
                0,
            );

            return statistics;
        });
    }

    onCollect(event: EditorStatisticsEvent) {
        if (!event.lcp) return;

        this.store.update((statistics) => {
            const { wpm, misses, percent } = statistics;

            const date = new Date().toISOString();

            if (event.wpm) {
                wpm.data.push({
                    date,
                    group: 'WPM',
                    value: event.wpm,
                    percent: event.percent,
                });

                percent.data.push({
                    date,
                    group: 'Percent',
                    value: event.percent,
                    percent: event.percent,
                });
            }

            if (event.incorrect) {
                misses.data.push({
                    date,
                    group: 'Misses',
                    value: event.incorrect.length,
                    percent: event.percent,
                });
            }

            return statistics;
        });
    }

    reset() {
        this.store.update((statistics) => {
            for (const statistic of Object.values(statistics)) {
                statistic.data = statistic.type === 'timeseries' ? [] : 0;
            }

            return statistics;
        });
    }
}
