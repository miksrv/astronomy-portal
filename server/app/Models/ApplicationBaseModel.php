<?php

namespace App\Models;

use CodeIgniter\Model;

class ApplicationBaseModel extends Model {

    protected array $hiddenFields = [];

    /**
     * @param array $data
     * @return array|array[]
     */
    public function prepareOutput(array $data): array
    {
        // if the hiddenFields array is empty, we just return the original dta
        if (sizeof($this->hiddenFields) == 0) {
            return $data;
        }

        // if no data was found we return the original data to ensure the right structure
        if (!$data['data']) {
            return $data;
        }

        $resultData = [];

        // We want the found data to be an array, so we can loop through it.
        // find() and first() return only one data item, not an array
        if (($data['method'] == 'find') || ($data['method'] == 'first')) {
            $data['data'] = [$data['data']];
        }

        if ($data['data']) {
            foreach ($data['data'] as $dataItem) {
                foreach ($this->hiddenFields as $attributeToHide) {
                    // here we hide the unwanted attributes, but we need to check if the return type of the model is an array or an object/entity
                    if (is_array($dataItem)) {
                        unset($dataItem[$attributeToHide]);
                    } else {
                        unset($dataItem->{$attributeToHide});
                    }
                }
                $resultData[] = $dataItem;
            }
        }

        // return the right data structure depending on the method used
        if (($data['method'] == 'find') || ($data['method'] == 'first')) {
            return ['data' => $resultData[0]];
        } else {
            return ['data' => $resultData];
        }
    }

    /**
     * @param array $data
     * @return array
     */
    protected function generateId(array $data): array
    {
        $data['data']['id'] = uniqid();

        return $data;
    }
}