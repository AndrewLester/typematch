<script lang="ts">
import type { MultiplayerStatistics } from '$lib/statistics';
import type { User } from '$lib/types';
import type { ComboChart as ComboChartRaw } from '@carbon/charts';
import {
    LineChart,
    type ChartTabularData,
    ScaleTypes,
    type LineChartOptions,
} from '@carbon/charts-svelte';
import '@carbon/charts-svelte/styles.css';
import { createEventDispatcher, onMount } from 'svelte';
import SingleplayerStatisticsView from './SingleplayerStatisticsView.svelte';

export let me: User;
export let users: Record<string, User>;
export let statistics: MultiplayerStatistics;
export let startTime: number;
export let skeleton = false;

let savedStatistics: MultiplayerStatistics = statistics;

const dispatch = createEventDispatcher<{
    inspect: number;
}>();

let multiplayer = true;
let chart: ComboChartRaw;

$: multiplayerPercentStatisticsOptions = {
    title: 'The Race',
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
            title: 'Percent',
            mapsTo: 'value',
            scaleType: ScaleTypes.LINEAR,
        },
    },
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
            return typeof value === 'number' ? value.toPrecision(4) : value;
        },
    },
    curve: 'curveMonotoneX',
    height: '400px',
    theme: 'g100',
} as LineChartOptions;

onMount(() => {
    // TODO: Add this back for WPM chart?
    // chart.services.events.addEventListener('scatter-mouseover', pointMouseOver);
    // return () =>
    //     chart.services.events.removeEventListener(
    //         'scatter-mouseover',
    //         pointMouseOver,
    //     );
});

function pointMouseOver(e: any) {
    const percent = e.detail.datum.extra as number;
    dispatch('inspect', percent);
}

function computeMultiplayerPercentStatistics(
    statistics: MultiplayerStatistics,
) {
    const data: ChartTabularData = [];

    for (const [userId, userStats] of Object.entries(statistics)) {
        const percentStat = userStats.percent;

        for (const record of percentStat.data) {
            const chartRecord = {
                group: users[userId].name,
                value: record.value,
                date: new Date(new Date(record.date).getTime() - startTime),
            };

            data.push(chartRecord);
        }
    }

    return data;
}
</script>

{#if multiplayer}
    <!-- <div class="podium">
        <div class="place">
            <h1>Name</h1>
            <h2>First</h2>
        </div>
        <div class="place">
            <h1>Name</h1>
            <h2>Second</h2>
        </div>
        <div class="place">
            <h1>Name</h1>
            <h2>Third</h2>
        </div>
    </div> -->

    <LineChart
        bind:chart
        data={computeMultiplayerPercentStatistics(savedStatistics)}
        theme="g100"
        options={multiplayerPercentStatisticsOptions}
    />

    <!-- <div class="statistics">
        <div class="statistic">
            <strong>{Math.round(statistics.avgWPM.data)}</strong>
            <span />
            <span>Avg WPM</span>
        </div>
        <div class="statistic">
            <strong>{Math.round(statistics.peakWPM.data)}</strong>
            <span>Peak WPM</span>
        </div>
    </div> -->
{:else}
    <SingleplayerStatisticsView
        {skeleton}
        {startTime}
        statistics={savedStatistics[me.id]}
        on:inspect
    />
{/if}

<style>
/* .statistics {
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
} */
</style>
