<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'africastalking' => [
    'username' => env('AFRICASTALKING_USERNAME','voiceapp1'),
    'key' => env('AFRICASTALKING_API_KEY','atsk_52e1c57e7e85f6b72a3feadc75348f990a77b11faaba39ef8acc119f44f9cb41ee9d494f'),
],


    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],

        'mpesa' => [
    'env'             => env('MPESA_ENV', 'sandbox'),
    'consumer_key'    => env('MPESA_CONSUMER_KEY'),
    'consumer_secret' => env('MPESA_CONSUMER_SECRET'),
    'shortcode'       => env('MPESA_SHORTCODE'),
    'passkey'         => env('MPESA_PASSKEY'),
    'callback_url'    => env('MPESA_CALLBACK'),
    'oauth_url'       => env('MPESA_OAUTH_URL'),
    'stk_url'         => env('MPESA_STK_URL'),
    'stk_query_url'   => env('MPESA_STK_QUERY_URL'),
],

    ],

];
