<?php namespace App\Validation;

use App\Models\UsersModel;
use Exception;

class UserRules {
    /**
     * @param string $str
     * @param string $fields
     * @param array $data
     * @return bool
     */
    public function validateUser(string $str, string $fields, array $data): bool {
        try {
            $userModel = new UsersModel();
            $userData  = $userModel->findUserByEmailAddress($data['email']);

            return password_verify($data['password'], $userData->password);

        } catch (Exception $e) {
            return false;
        }
    }
}