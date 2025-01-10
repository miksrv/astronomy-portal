<?php

use App\Entities\UserEntity;
use App\Models\UsersModel;
use Config\Services;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * @param string|null $encodedToken
 * @return User|null
 */
function validateAuthToken(string $encodedToken = null):? UserEntity {
    if (!$encodedToken) {
        return null;
    }

    try {
        $userModel = new UsersModel();
        $secretKey = Services::getSecretKey();
        $decoded   = JWT::decode($encodedToken, new Key($secretKey, 'HS256'));
        $userData  = $userModel->findUserByEmailAddress($decoded->email);

        if (!$userData) {
            return null;
        }

        return $userData;
    } catch (\Throwable $e) {
        return null;
    }
}

/**
 * @param string $email
 * @return string
 */
function generateAuthToken(string $email): string {
    $issuedAtTime    = time();
    $tokenTimeToLive = getenv('auth.token.live');
    $tokenExpiration = $issuedAtTime + ($tokenTimeToLive);

    $payload = [
        'email' => $email,
        'iat'   => $issuedAtTime,
        'exp'   => $tokenExpiration,
    ];

    return JWT::encode($payload, Services::getSecretKey(), 'HS256');
}

/**
 * @param string $password
 * @return string
 */
function hashUserPassword(string $password): string {
    return password_hash($password, PASSWORD_ARGON2ID);
}
