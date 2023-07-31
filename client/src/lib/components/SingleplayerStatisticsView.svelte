<script lang="ts">
import type {
    SingleplayerStatistics,
    TimeseriesPlayerStatistic,
} from '$lib/statistics';
import type { ComboChart as ComboChartRaw } from '@carbon/charts';
import {
    ComboChart,
    type ChartTabularData,
    ScaleTypes,
    type ComboChartOptions,
} from '@carbon/charts-svelte';
import '@carbon/charts-svelte/styles.css';
import { createEventDispatcher, onMount } from 'svelte';

export let startTime: number;
export let statistics: SingleplayerStatistics;
export let skeleton = false;

const dispatch = createEventDispatcher<{
    inspect: number;
}>();
const singlePlayerOverallStatistics = new Set(['WPM', 'Misses', 'Percent']);

let chart: ComboChartRaw;

$: singlePlayerOverallStatisticsOptions = {
    title: 'Overall Stats',
    color: {
        scale: {
            WPM: '#8b3ffc',
            Misses: '#BB2200',
            Percent: '#22BB00',
        },
    },
    data: {
        loading: skeleton,
    },
    axes: {
        bottom: {
            title: 'Time',
            mapsTo: 'date',
            scaleType: ScaleTypes.TIME,
            ticks: {
                formatter: new Intl.DateTimeFormat('en', {
                    minute: '2-digit',
                    second: '2-digit',
                }).format,
            },
            timeScale: {
                timeIntervalFormats: {
                    '15seconds': {
                        primary: 'MM:SS',
                    },
                },
            },
        },
        left: {
            title: 'WPM',
            mapsTo: 'WPM',
            scaleType: ScaleTypes.LINEAR,
        },
        right: {
            title: 'Percent (GRN) / Misses (RED)',
            mapsTo: 'value',
            scaleType: ScaleTypes.LINEAR,
            correspondingDatasets: ['Misses', 'Percent'],
        },
    },
    comboChartTypes: [
        {
            type: 'line',
            options: {},
            correspondingDatasets: ['WPM'],
        },
        {
            type: 'scatter',
            options: {},
            correspondingDatasets: ['Misses'],
        },
        {
            type: 'line',
            options: {
                points: {
                    enabled: false,
                },
            },
            correspondingDatasets: ['Percent'],
        },
    ],
    timeScale: {
        addSpaceOnEdges: 0,
    },
    tooltip: {
        valueFormatter(value, label) {
            if (label === 'Time') {
                return new Intl.DateTimeFormat('en', {
                    minute: '2-digit',
                    second: '2-digit',
                }).format(value);
            }
            return value;
        },
    },
    curve: 'curveMonotoneX',
    height: '400px',
    theme: 'g100',
} as ComboChartOptions;

onMount(() => {
    chart.services.events.addEventListener('scatter-mouseover', pointMouseOver);

    return () =>
        chart.services.events.removeEventListener(
            'scatter-mouseover',
            pointMouseOver,
        );
});

function pointMouseOver(e: any) {
    const percent = e.detail.datum.extra as number;
    dispatch('inspect', percent);
}

function computeSinglePlayerOverallStatistics(
    statistics: SingleplayerStatistics,
) {
    const overallStatistics = Object.values(statistics).filter((statistic) =>
        singlePlayerOverallStatistics.has(statistic.title),
    ) as TimeseriesPlayerStatistic[];

    const data: ChartTabularData = [];

    for (const statistic of overallStatistics) {
        for (const record of statistic.data) {
            const chartRecord = {
                group: record.group,
                [statistic.title === 'WPM' ? 'WPM' : 'value']: record.value,
                date: new Date(new Date(record.date).getTime() - startTime),
                extra: record.percent,
            };

            data.push(chartRecord);
        }
    }

    return data;
}
</script>

<ComboChart
    bind:chart
    data={computeSinglePlayerOverallStatistics(statistics)}
    theme="g100"
    options={singlePlayerOverallStatisticsOptions}
/>

<div class="statistics">
    <div class="statistic">
        <strong>{Math.round(statistics.avgWPM.data)}</strong>
        <span>Avg WPM</span>
    </div>
    <div class="statistic">
        <strong>{Math.round(statistics.peakWPM.data)}</strong>
        <span>Peak WPM</span>
    </div>
</div>

<style>
.statistics {
    display: flex;
    flex-flow: row wrap;
    gap: 50px;
    align-items: center;
    justify-content: center;
    margin-block: 50px;
}

.statistic {
    display: flex;
    flex-flow: column nowrap;
    text-align: center;
    align-items: center;
    gap: 5px;
    border-radius: 5px;
    transition: all 250ms ease;
    padding: 5px;
}

.statistic:hover {
    background-color: rgb(42, 42, 42);
}

.statistic > strong {
    font-size: 2.25rem;
}

.statistic > span {
    color: rgb(200, 200, 200);
}
</style>
