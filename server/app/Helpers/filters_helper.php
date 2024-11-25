<?php

if (!function_exists('prepareObjectDataWithFilters')) {
    /**
     * Prepares object data by grouping and associating filters with statistics.
     *
     * @param array $objectsData Array of objects to be processed.
     * @param array $filtersData Array of filters to associate with objects.
     * @return array An array of objects, each containing associated filters and statistics.
     */
    function prepareObjectDataWithFilters(array $objectsData, array $filtersData): array
    {
        // Group filters by object_name for faster lookup
        $filtersGroupedByObject = [];
        foreach ($filtersData as $filter) {
            $filtersGroupedByObject[$filter->object_name][] = $filter;
        }

        // Iterate over objects and calculate statistics for related filters
        foreach ($objectsData as $object) {
            $relatedFilters = $filtersGroupedByObject[$object->name] ?? [];

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

                // Add filter statistics to the object
                $object->filters   = $filterStatistic;
                $object->statistic = [
                    'frames'   => $totalFrames,
                    'exposure' => $totalExposure,
                    'fileSize' => $totalFileSize
                ];
            }
        }

        return $objectsData;
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
