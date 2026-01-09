<?php

// config/cors.php

return [

    'paths' => [
        'api/*',
        'webhooks/*',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'chats/*',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://sitebase.co.ke',
        'https://www.sitebase.co.ke',

        // keep local for maintenance/debug
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
