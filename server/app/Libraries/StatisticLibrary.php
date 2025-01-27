<?php namespace App\Libraries;

class StatisticLibrary {
    protected array $filterEnum = [
        'luminance' => 'luminance',
        'l'         => 'luminance',
        'red'       => 'red',
        'r'         => 'red',
        'green'     => 'green',
        'g'         => 'green',
        'blue'      => 'blue',
        'b'         => 'blue',
        'ha'        => 'hydrogen',
        'h'         => 'hydrogen',
        'oiii'      => 'oxygen',
        'o'         => 'oxygen',
        'sii'       => 'sulfur',
        's'         => 'sulfur',
        'clear'     => 'unknown'
    ];

    /**
     * @param array $filesItems
     * @param string|null $object
     * @param string|null $photoDate
     * @return object|null
     */
    public function getObjectStatistic(
        array $filesItems,
        string $object = null,
        string $photoDate = null
    ): ?object {
        if (!$filesItems) {
            return null;
        }

        $lastUpdatedDate = '';
        $filterStatistic = (object) [];
        $objectStatistic = (object) [
            'frames'    => 0,
            'data_size' => 0,
            'exposure'  => 0
        ];

        foreach ($filesItems as $file) {
            if ($object && $object !== $file->object) {
                continue;
            }

            if ($photoDate && strtotime($file->date_obs . ' +5 hours') > strtotime($photoDate . ' 23:59:59')) {
                continue;
            }

            if (!$lastUpdatedDate) {
                $lastUpdatedDate = $file->date_obs;
            } else {
                $lastUpdatedDate = max($lastUpdatedDate, $file->date_obs);
            }

            $filterName = $this->filterEnum[strtolower($file->filter)] ?? 'unknown';

            $objectStatistic->frames   += 1;
            $objectStatistic->exposure += $file->exptime;

            if (isset($filterStatistic->{$filterName})) {
                $filterStatistic->{$filterName}->exposure += $file->exptime;
                $filterStatistic->{$filterName}->frames   += 1;
            } else {
                $filterStatistic->{$filterName} = (object) [
                    'exposure' => $file->exptime,
                    'frames'   => 1
                ];
            }
        }

        $objectStatistic->data_size = round($objectStatistic->frames * FITS_FILE_SIZE);

        return (object) [
            'filterStatistic' => $filterStatistic,
            'objectStatistic' => $objectStatistic,
            'lastUpdatedDate' => $lastUpdatedDate
        ];
    }

    /**
     * @param string $filter
     * @return string
     */
    public function mappingFilesFilters(string $filter): string {
        return $this->filterEnum[$filter] ?? 'unknown';
    }
}
