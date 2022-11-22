<script lang="ts">
import type { PlayerStatistic, PlayerStatisticType } from '$lib/statistics';
import { ComboChart } from '@carbon/charts-svelte';
import type { ChartTabularData, ScaleTypes } from '@carbon/charts/interfaces';

export let singleplayer = true;
export let statistics: PlayerStatistic[];
export let skeleton = false;

const singlePlayerOverallStatistics = new Set([
    'wpm',
    'misses',
    'percent',
]) as Set<PlayerStatisticType>;
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
            scaleType: 'time' as ScaleTypes.TIME,
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
            mapsTo: 'wpm',
            scaleType: 'linear' as ScaleTypes.LINEAR,
        },
        right: {
            title: 'Percent (GRN) / Misses (RED)',
            mapsTo: 'value',
            scaleType: 'linear' as ScaleTypes.LINEAR,
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
            type: 'line',
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
    curve: 'curveMonotoneX',
    height: '400px',
};

function computeSinglePlayerOverallStatistics(statistics: PlayerStatistic[]) {
    const overallStatistics = statistics.filter((statistic) =>
        singlePlayerOverallStatistics.has(statistic.type),
    );

    const data: ChartTabularData = [];

    for (const statistic of overallStatistics) {
        for (const record of statistic.data) {
            const chartRecord = {
                group: record.group,
                [statistic.type === 'wpm' ? 'wpm' : 'value']: record.value,
                date: record.date,
            };

            data.push(chartRecord);
        }
    }

    return data;
}
</script>

{#if singleplayer}
    <ComboChart
        data={computeSinglePlayerOverallStatistics(statistics)}
        theme="g100"
        options={singlePlayerOverallStatisticsOptions}
    />
{:else}{/if}
