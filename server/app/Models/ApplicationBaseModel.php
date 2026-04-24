<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * ApplicationBaseModel
 *
 * Shared base class for all application models. Extends CI4's Model and adds
 * two common utilities used across models:
 *   - prepareOutput(): strips hidden fields from afterFind callback data.
 *   - generateId():    beforeInsert callback that assigns a uniqid() string PK.
 */
class ApplicationBaseModel extends Model
{
    /** @var array<string> List of field names to strip in the afterFind callback. */
    protected array $hiddenFields = [];

    /**
     * afterFind callback: removes fields listed in $hiddenFields from the result set.
     *
     * Called automatically by CI4 when $afterFind contains 'prepareOutput'.
     * Works for both single-row (find/first) and multi-row (findAll) results.
     *
     * @param array $data The callback data array passed by CI4 (keys: data, method, returnData).
     * @return array The callback data array with hidden fields removed from data.
     */
    public function prepareOutput(array $data): array
    {
        // If the hiddenFields array is empty, return the original data unchanged.
        if (count($this->hiddenFields) === 0) {
            return $data;
        }

        // If no data was found, return the original structure to preserve method/returnData keys.
        if (!$data['data']) {
            return $data;
        }

        $resultData = [];

        // find() and first() return a single item, not an array — normalise to array for the loop.
        if (($data['method'] === 'find') || ($data['method'] === 'first')) {
            $data['data'] = [$data['data']];
        }

        if ($data['data']) {
            foreach ($data['data'] as $dataItem) {
                foreach ($this->hiddenFields as $attributeToHide) {
                    // Support both array and object/entity return types.
                    if (is_array($dataItem)) {
                        unset($dataItem[$attributeToHide]);
                    } else {
                        unset($dataItem->{$attributeToHide});
                    }
                }

                $resultData[] = $dataItem;
            }
        }

        // Restore the single-item structure for find/first results.
        if (($data['method'] === 'find') || ($data['method'] === 'first')) {
            return ['data' => $resultData[0]];
        }

        return ['data' => $resultData];
    }

    /**
     * beforeInsert callback: assigns a uniqid() string as the primary key.
     *
     * Used by models that set $useAutoIncrement = false and include 'generateId'
     * in their $beforeInsert callback list.
     *
     * @param array $data The callback data array passed by CI4 (key: data contains the row).
     * @return array The callback data array with 'id' populated in the row.
     */
    protected function generateId(array $data): array
    {
        $data['data']['id'] = uniqid();

        return $data;
    }
}
