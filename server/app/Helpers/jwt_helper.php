<?php

use App\Models\UserModel;
use Config\Services;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * @throws Exception
 */
function getJWTFromRequest($authenticationHeader): string
{
    if (is_null($authenticationHeader))
    {
        throw new Exception('Missing or invalid JWT in request');
    }

    return explode(' ', $authenticationHeader)[1];
}

/**
 * @throws Exception
 */
function validateJWTFromRequest(string $encodedToken)
{
    $secretKey    = Services::getSecretKey();
    $decodedToken = JWT::decode($encodedToken, new Key($secretKey, 'HS256'));

    $userModel = new UserModel();
    $userModel->findUserByEmailAddress($decodedToken->email);
}

function getSignedJWTForUser(string $email): string
{
    $issuedAtTime    = time();
    $tokenTimeToLive = getenv('JWT_TIME_TO_LIVE');
    $tokenExpiration = $issuedAtTime + $tokenTimeToLive;

    $payload = [
        'email' => $email,
        'iat' => $issuedAtTime,
        'exp' => $tokenExpiration,
    ];

    return JWT::encode($payload, Services::getSecretKey(), 'HS256');
}