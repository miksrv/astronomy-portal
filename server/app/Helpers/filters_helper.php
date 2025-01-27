<?php

if (!function_exists('prepareDataWithFilters')) {
    /**
     * Prepares data by grouping and associating filters with statistics.
     *
     * @param array $data Array of data to be processed.
     * @param array $filters Array of filters to associate with data.
     * @param string $groupByKey The key to group filters by (e.g., 'object_name' or 'photo_id').
     * @return array An array of data, each containing associated filters and statistics.
     */
    function prepareDataWithFilters(array $data, array $filters, string $groupByKey, string $objectKey): array
    {
        // Group filters by the specified key for faster lookup
        $filtersGroupedByKey = [];
        foreach ($filters as $filter) {
            $filtersGroupedByKey[$filter->$groupByKey][] = $filter;
        }

        // Iterate over data and calculate statistics for related filters
        foreach ($data as $item) {
            $relatedFilters = $filtersGroupedByKey[$item->$objectKey] ?? [];

            if (!empty($relatedFilters)) {
                $filterStatistic = [];
                $totalFrames   = 0;
                $totalExposure = 0;
                $totalFileSize = 0;

                // Aggregate statistics for each related filter
                foreach ($relatedFilters as $filter) {
                    $totalFrames   += $filter->frames_count;
                    $totalExposure += $filter->exposure_time;
                    $totalFileSize += $filter->files_size;

                    // Store individual filter statistics
                    $filterStatistic[$filter->filter] = [
                        'frames'   => $filter->frames_count,
                        'exposure' => $filter->exposure_time,
                        'fileSize' => $filter->files_size
                    ];
                }

                // Add filter statistics to the item
                $item->filters   = $filterStatistic;
                $item->statistic = [
                    'frames'   => $totalFrames,
                    'exposure' => $totalExposure,
                    'fileSize' => $totalFileSize
                ];
            }
        }

        return $data;
    }
}

if (!function_exists('prepareObjectDataWithFilters')) {
    function prepareObjectDataWithFilters(array $objectsData, array $filtersData): array
    {
        return prepareDataWithFilters($objectsData, $filtersData, 'object_name', 'name');
    }
}

if (!function_exists('preparePhotoDataWithFilters')) {
    function preparePhotoDataWithFilters(array $objectsData, array $filtersData): array
    {
        return prepareDataWithFilters($objectsData, $filtersData, 'photo_id', 'id');
    }
}

if (!function_exists('mappingFilters')) {
    /**
     * Maps filter name to a short representation used in the system.
     *
     * This function converts filter names (e.g., 'luminance', 'red')
     * into standardized short names like 'L', 'R'.
     *
     * @param string $filter The original filter name.
     *
     * @return string The standardized filter name.
     */
    function mappingFilters(string $filter): string
    {
        $map = [
            'luminance' => 'L', 'l' => 'L',
            'red' => 'R', 'r' => 'R',
            'green' => 'G', 'g' => 'G',
            'blue' => 'B', 'b' => 'B',
            'ha' => 'H', 'h' => 'H',
            'oiii' => 'O', 'o' => 'O',
            'sii' => 'S', 's' => 'S',
        ];

        return $map[strtolower($filter)] ?? 'N';  // Default to 'N' if not found
    }
}
