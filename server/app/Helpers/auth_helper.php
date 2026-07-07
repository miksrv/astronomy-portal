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

        // The token carries the session id that was active when it was issued.
        // Logout clears users.session_token to NULL, which never matches any
        // previously issued token's `sid` — instantly revoking it everywhere,
        // regardless of how much of its lifetime (exp) is left.
        $tokenSessionId = $decoded->sid ?? null;

        if (empty($userData->session_token) || $tokenSessionId !== $userData->session_token) {
            return null;
        }

        return $userData;
    } catch (\Throwable $e) {
        return null;
    }
}

/**
 * @param string $email
 * @param string $sessionToken Current session id (users.session_token) to embed as the `sid` claim.
 * @return string
 */
function generateAuthToken(string $email, string $sessionToken): string {
    $issuedAtTime    = time();
    $tokenTimeToLive = getenv('auth.token.live');
    $tokenExpiration = $issuedAtTime + ($tokenTimeToLive);

    $payload = [
        'email' => $email,
        'sid'   => $sessionToken,
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
