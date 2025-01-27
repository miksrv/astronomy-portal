<?php

namespace App\Controllers;

use App\Models\ObjectFitsFiltersModel;
use App\Models\ObjectFitsFilesModel;
use App\Entities\ObjectFitsFiltersEntity;
use CodeIgniter\RESTful\ResourceController;
use ReflectionException;
use Exception;

class System extends ResourceController
{
	/**
	 * Recalculates the FITS filter statistics for each object.
	 *
	 * It aggregates data from the files and updates the corresponding filters
	 * in the database if there are changes in frame count, exposure time, or file size.
	 *
	 * @return void
	 */
	public function recalculateFitsFilters(): void
	{
		helper('filters');

		$dataObjects = [];
		$filterModel = new ObjectFitsFiltersModel();
		$filesModel  = new ObjectFitsFilesModel();
		$filesData   = $filesModel->getObjectStatistic();

		foreach ($filesData as $file) {
			$filter = mappingFilters($file->filter);

			if (!isset($dataObjects[$file->object][$filter])) {
				$dataObjects[$file->object][$filter] = [
					'frames_count'  => 1,
					'exposure_time' => $file->exptime,
					'files_size'    => $file->file_size
				];
			} else {
				$dataObjects[$file->object][$filter] = [
					'frames_count'  => $dataObjects[$file->object][$filter]['frames_count'] + 1,
					'exposure_time' => $dataObjects[$file->object][$filter]['exposure_time'] + $file->exptime,
					'files_size'    => $dataObjects[$file->object][$filter]['files_size'] + $file->file_size
				];
			}
		}

		foreach ($dataObjects as $objectName => $filter) {
			foreach ($filter as $filterName => $filterData) {
	            $objectFitsFilters =
	            	$filterModel->getDataByObjectFilter($objectName, $filterName)
	            	?? new ObjectFitsFiltersEntity();

	            $objectFitsFilters->object_name  = $objectName;
	            $objectFitsFilters->filter       = $filterName;

		        // Only update if values have changed
		        if ((int) $filterData['frames_count'] !== $objectFitsFilters->frames_count) {
		            $objectFitsFilters->frames_count = (int) $filterData['frames_count'];
		        }

		        if ((float) $filterData['exposure_time'] !== $objectFitsFilters->exposure_time) {
		            $objectFitsFilters->exposure_time = (float) $filterData['exposure_time'];
		        }

		        if ((float) $filterData['files_size'] !== $objectFitsFilters->files_size) {
		            $objectFitsFilters->files_size = (float) $filterData['files_size'];
		        }

				if ($objectFitsFilters->hasChanged('frames_count')
					|| $objectFitsFilters->hasChanged('exposure_time')
					|| $objectFitsFilters->hasChanged('files_size'))
				{
					$objectHaveUpdates = true;
				    $filterModel->save($objectFitsFilters);
				}
			}
		}
	}
}
