<?php

namespace App\Http\Controllers;

use App\Models\CallLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use Inertia\Inertia;

class VoiceController extends Controller
{
    private const AGENT_STATUSES = ['available', 'busy', 'away', 'offline', 'on_call'];

    public function index()
    {
        return Inertia::render('Voice/index', [
            'callFrom' => $this->callFrom(),
            'username' => $this->username(),
        ]);
    }

    public function logsPage(Request $request)
    {
        $direction = (string) $request->input('direction', 'all');
        $status = (string) $request->input('status', 'all');
        $search = trim((string) $request->input('q', ''));
        $perPage = max(10, min((int) $request->input('per_page', 15), 50));

        try {
            if (! Schema::hasTable('call_logs')) {
                return Inertia::render('Voice/logs', [
                    'logs' => [
                        'data' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'total' => 0,
                        'per_page' => $perPage,
                    ],
                    'filters' => [
                        'direction' => $direction,
                        'status' => $status,
                        'q' => $search,
                        'per_page' => $perPage,
                    ],
                    'summary' => [
                        'total' => 0,
                        'active' => 0,
                        'missed' => 0,
                        'completed_today' => 0,
                    ],
                    'sessions' => [],
                ]);
            }

            $logsQuery = CallLog::query()
                ->with('agent:id,name')
                ->latest('created_at');

            if (in_array($direction, ['inbound', 'outbound'], true)) {
                $logsQuery->where('direction', $direction);
            }

            if ($status !== '' && $status !== 'all') {
                $logsQuery->where('status', $status);
            }

            if ($search !== '') {
                $logsQuery->where(function ($query) use ($search) {
                    $query->where('from_number', 'like', "%{$search}%")
                        ->orWhere('to_number', 'like', "%{$search}%")
                        ->orWhere('session_id', 'like', "%{$search}%")
                        ->orWhere('provider_session_id', 'like', "%{$search}%");
                });
            }

            $logs = $logsQuery->paginate($perPage)->withQueryString();
            $logs->getCollection()->transform(function (CallLog $log) {
                if ((int) $log->duration_seconds <= 0) {
                    $log->duration_seconds = $this->resolveDurationSeconds($log);
                }

                return $log;
            });

            $sessionsQuery = User::query()
                ->whereRaw("LOWER(TRIM(roles)) LIKE 'callcenter%'")
                ->orderBy('name');

            $hasStatusColumn = Schema::hasColumn('users', 'status');
            $sessions = $sessionsQuery
                ->select($hasStatusColumn ? ['id', 'name', 'status'] : ['id', 'name'])
                ->get()
                ->map(function (User $agent) use ($hasStatusColumn) {
                    return [
                        'id' => $agent->id,
                        'name' => $agent->name,
                        'status' => $hasStatusColumn ? $agent->status : 'offline',
                        'client_name' => Cache::get("voice_agent_client_{$agent->id}"),
                        'last_seen' => Cache::get("voice_agent_last_seen_{$agent->id}"),
                    ];
                })
                ->values();

            return Inertia::render('Voice/logs', [
                'logs' => $logs,
                'filters' => [
                    'direction' => $direction,
                    'status' => $status,
                    'q' => $search,
                    'per_page' => $perPage,
                ],
                'summary' => [
                    'total' => (int) CallLog::count(),
                    'active' => (int) CallLog::whereIn('status', ['initiated', 'ringing', 'connected'])->count(),
                    'missed' => (int) CallLog::where('is_missed', true)->count(),
                    'completed_today' => (int) CallLog::where('status', 'completed')->whereDate('updated_at', today())->count(),
                ],
                'sessions' => $sessions,
            ]);
        } catch (QueryException $e) {
            Log::error('Failed to load voice logs page data', [
                'error' => $e->getMessage(),
            ]);

            return Inertia::render('Voice/logs', [
                'logs' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => 0,
                    'per_page' => $perPage,
                ],
                'filters' => [
                    'direction' => $direction,
                    'status' => $status,
                    'q' => $search,
                    'per_page' => $perPage,
                ],
                'summary' => [
                    'total' => 0,
                    'active' => 0,
                    'missed' => 0,
                    'completed_today' => 0,
                ],
                'sessions' => [],
            ]);
        }
    }

    public function getCapabilityToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'nullable|string|max:120',
            'agent_user_id' => 'nullable|integer|exists:users,id',
        ]);

        $clientName = $validated['client_name'] ?? ('agent_' . Str::lower(Str::random(12)));
        $agentUserId = $validated['agent_user_id'] ?? $request->user()?->id;

        if (! $this->apiKey()) {
            return response()->json([
                'success' => false,
                'error' => 'Missing Africa\'s Talking API key configuration.',
            ], 500);
        }

        try {
            $payload = [
                'username' => $this->username(),
                'clientName' => $clientName,
                'phoneNumber' => $this->callFrom(),
            ];

            $response = Http::timeout(30)
                ->withHeaders([
                    'apiKey' => $this->apiKey(),
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->post('https://webrtc.africastalking.com/capability-token/request', $payload);

            if (! $response->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to get capability token.',
                    'details' => $response->body(),
                ], 400);
            }

            $data = $response->json();
            if (! isset($data['token'])) {
                return response()->json([
                    'success' => false,
                    'error' => 'No token received from provider.',
                    'response' => $data,
                ], 500);
            }

            Cache::put("voice_client_user_{$clientName}", $agentUserId, now()->addDay());
            if ($agentUserId) {
                Cache::put("voice_agent_client_{$agentUserId}", $clientName, now()->addDay());
                Cache::put("voice_agent_last_seen_{$agentUserId}", now()->timestamp, now()->addHour());
            }
            Cache::put('default_agent', $clientName, now()->addDay());

            Log::info('WebRTC client token generated', [
                'client_name' => $clientName,
                'agent_user_id' => $agentUserId,
                'mapped' => (bool) $agentUserId,
            ]);

            return response()->json([
                'success' => true,
                'token' => $data['token'],
                'clientName' => $clientName,
                'fullClientName' => $this->username() . '.' . $clientName,
                'lifeTimeSec' => $data['lifeTimeSec'] ?? 86400,
                'incoming' => $data['incoming'] ?? true,
                'outgoing' => $data['outgoing'] ?? true,
            ]);
        } catch (\Throwable $e) {
            Log::error('Capability token error', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => 'Network error while generating token.',
            ], 500);
        }
    }

    public function generateWebRTCToken(Request $request): JsonResponse
    {
        $agentUserId = $request->integer('agent_user_id') ?: $request->user()?->id;
        $request->merge([
            'client_name' => $request->input('client_name', 'agent_' . Str::lower(Str::random(12))),
            'agent_user_id' => $agentUserId ?: null,
        ]);

        return $this->getCapabilityToken($request);
    }

    public function makeCall(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone_number' => 'required|string',
            'client_name' => 'required|string|max:120',
            'agent_user_id' => 'nullable|integer|exists:users,id',
        ]);

        if (! $this->apiKey()) {
            return response()->json([
                'success' => false,
                'error' => 'Missing Africa\'s Talking API key configuration.',
            ], 500);
        }

        $phoneNumber = $this->normalizePhone($validated['phone_number']);
        $clientName = $validated['client_name'];
        $agentUserId = $validated['agent_user_id'] ?? null;
        $localSessionId = 'outbound_' . Str::uuid()->toString();

        $callLog = CallLog::create([
            'session_id' => $localSessionId,
            'direction' => 'outbound',
            'from_number' => $this->callFrom(),
            'to_number' => $phoneNumber,
            'agent_user_id' => $agentUserId,
            'agent_client_name' => $clientName,
            'status' => 'initiated',
            'started_at' => now(),
            'metadata' => [
                'source' => 'manual_outbound',
            ],
        ]);

        try {
            Cache::put("outbound_call_{$localSessionId}", [
                'client_name' => $clientName,
                'phone_number' => $phoneNumber,
                'agent_user_id' => $agentUserId,
                'call_log_id' => $callLog->id,
                'initiated_at' => now()->toIso8601String(),
            ], now()->addHours(4));
            Cache::put("active_outbound_{$phoneNumber}", $localSessionId, now()->addHours(4));
        } catch (\Throwable $e) {
            Log::warning('Failed to cache outbound call mapping', [
                'session_id' => $localSessionId,
                'to_number' => $phoneNumber,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $callbackUrl = url('/api/webhooks/voice/callback');

            $response = Http::timeout(30)
                ->asForm()
                ->withHeaders([
                    'Apikey' => $this->apiKey(),
                    'Accept' => 'application/json',
                ])->post('https://voice.africastalking.com/call', [
                    'username' => $this->username(),
                    'to' => $phoneNumber,
                    'from' => $this->callFrom(),
                    'callbackUrl' => $callbackUrl,
                ]);

            $responseData = $response->json() ?? [];

            if (! $response->successful() || (($responseData['errorMessage'] ?? 'None') !== 'None')) {
                $callLog->update([
                    'status' => 'failed',
                    'ended_at' => now(),
                    'metadata' => array_merge($callLog->metadata ?? [], [
                        'provider_error' => $responseData['errorMessage'] ?? $response->body(),
                    ]),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => $responseData['errorMessage'] ?? 'Failed to initiate call.',
                ], 500);
            }

            $callLog->update([
                'status' => 'ringing',
                'metadata' => array_merge($callLog->metadata ?? [], [
                    'provider_response' => $responseData,
                ]),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call initiated successfully.',
                'session_id' => $localSessionId,
                'data' => $responseData,
            ]);
        } catch (\Throwable $e) {
            $callLog->update([
                'status' => 'failed',
                'ended_at' => now(),
                'metadata' => array_merge($callLog->metadata ?? [], [
                    'exception' => $e->getMessage(),
                ]),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Network error while initiating call.',
            ], 500);
        }
    }

    public function endCall(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
        ]);

        $call = CallLog::where('session_id', $validated['session_id'])->latest()->first();

        if ($call) {
            $metadata = $call->metadata ?? [];
            $metadata['provider_end_state'] = $metadata['provider_end_state'] ?? 'manual_end';

            $call->update([
                'status' => 'completed',
                'ended_at' => now(),
                'duration_seconds' => $this->resolveDurationSeconds($call, (int) $call->duration_seconds, now()),
                'metadata' => $metadata,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Call marked as ended.',
        ]);
    }

    public function logCall(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'nullable|string',
            'phone_number' => 'nullable|string',
            'call_type' => 'required|in:incoming,outgoing',
            'call_status' => 'required|string|max:50',
            'duration' => 'nullable|integer|min:0',
            'agent_user_id' => 'nullable|integer|exists:users,id',
            'client_name' => 'nullable|string|max:120',
        ]);

        $sessionId = $validated['session_id'] ?? ('manual_' . Str::uuid()->toString());

        $call = CallLog::firstOrCreate(
            ['session_id' => $sessionId],
            [
                'direction' => $validated['call_type'] === 'incoming' ? 'inbound' : 'outbound',
                'from_number' => $validated['call_type'] === 'incoming' ? ($validated['phone_number'] ?? null) : $this->callFrom(),
                'to_number' => $validated['call_type'] === 'incoming' ? $this->callFrom() : ($validated['phone_number'] ?? null),
                'agent_user_id' => $validated['agent_user_id'] ?? null,
                'agent_client_name' => $validated['client_name'] ?? null,
                'status' => 'initiated',
                'started_at' => now(),
            ]
        );

        $isEnded = in_array($validated['call_status'], ['ended', 'completed', 'failed', 'missed'], true);
        $endedAt = $isEnded ? now() : $call->ended_at;

        $call->update([
            'status' => $validated['call_status'],
            'duration_seconds' => $this->resolveDurationSeconds(
                $call,
                (int) ($validated['duration'] ?? 0),
                $endedAt,
            ),
            'ended_at' => $endedAt,
            'is_missed' => $validated['call_status'] === 'missed',
        ]);

        return response()->json(['success' => true]);
    }

    public function callCallback(Request $request)
    {
        $sessionId = (string) $request->input('sessionId', Str::uuid()->toString());
        $direction = strtolower((string) $request->input('direction', ''));
        $isActive = (string) $request->input('isActive', '0') === '1';
        $callSessionState = (string) $request->input('callSessionState', '');
        $callerNumber = (string) $request->input('callerNumber', '');
        $destinationNumber = (string) $request->input('destinationNumber', '');

        Log::info('Voice callback received', [
            'sessionId' => $sessionId,
            'direction' => $direction,
            'isActive' => $isActive,
            'callSessionState' => $callSessionState,
            'callerNumber' => $callerNumber,
            'destinationNumber' => $destinationNumber,
        ]);

        if ($direction === 'inbound') {
            return $this->handleInboundCallback($sessionId, $isActive, $callSessionState, $callerNumber, $destinationNumber);
        }

        return $this->handleOutboundCallback($sessionId, $isActive, $callSessionState, $callerNumber, $destinationNumber);
    }

    public function incomingCall(Request $request)
    {
        return $this->callCallback($request->merge([
            'direction' => 'inbound',
            'isActive' => $request->input('isActive', '1'),
        ]));
    }

    public function callStatus(Request $request): JsonResponse
    {
        $sessionId = (string) $request->input('sessionId', '');
        $state = strtolower(trim((string) $request->input('callSessionState', '')));
        $direction = strtolower((string) $request->input('direction', ''));
        $duration = (int) $request->input('durationInSeconds', $request->input('duration', 0));

        if (! $sessionId) {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        $call = CallLog::where('provider_session_id', $sessionId)
            ->orWhere('session_id', $sessionId)
            ->latest()
            ->first();

        if (! $call) {
            $call = CallLog::create([
                'session_id' => $sessionId,
                'provider_session_id' => $sessionId,
                'direction' => $direction === 'inbound' ? 'inbound' : 'outbound',
                'status' => 'initiated',
                'started_at' => now(),
            ]);
        }

        $status = $this->mapProviderStateToStatus($state);
        $isMissed = $call->direction === 'inbound' && in_array($status, ['failed', 'completed'], true) && ! $call->answered_at;
        $endedStates = ['completed', 'failed', 'notanswered', 'busy', 'rejected', 'unavailable', 'noanswer', 'ended'];
        $metadata = array_merge($call->metadata ?? [], [
            'status_callback' => $request->all(),
        ]);
        if ($state !== '' && in_array($state, $endedStates, true)) {
            $metadata['provider_end_state'] = $state;
        }

        $endedAt = in_array($status, ['completed', 'failed'], true) ? now() : $call->ended_at;

        $call->update([
            'provider_session_id' => $sessionId,
            'status' => $isMissed ? 'missed' : $status,
            'duration_seconds' => $this->resolveDurationSeconds($call, $duration, $endedAt),
            'answered_at' => $status === 'connected' ? ($call->answered_at ?? now()) : $call->answered_at,
            'ended_at' => $endedAt,
            'is_missed' => $isMissed,
            'metadata' => $metadata,
        ]);

        if ($call->agent_user_id && in_array($status, ['completed', 'failed'], true)) {
            $this->setAgentStatusIfExists($call->agent_user_id, 'available');
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function updateAgentStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:' . implode(',', self::AGENT_STATUSES),
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to determine user.',
            ], 401);
        }

        $nextStatus = strtolower(trim($validated['status']));
        $hasClientMapping = (bool) Cache::get("voice_agent_client_{$user->id}");
        if ($nextStatus === 'available' && ! $hasClientMapping) {
            return response()->json([
                'success' => false,
                'error' => 'Initialize call client first before setting status to available.',
            ], 422);
        }

        $user->status = $nextStatus;
        $user->save();

        if ($validated['status'] === 'offline') {
            Cache::forget("voice_agent_client_{$user->id}");
            Cache::forget("voice_agent_last_seen_{$user->id}");
        }

        return response()->json([
            'success' => true,
            'status' => $user->status,
        ]);
    }

    public function checkClientHealth(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to determine user.',
            ], 401);
        }

        try {
            Cache::put("voice_agent_last_seen_{$user->id}", now()->timestamp, now()->addMinutes(10));
        } catch (\Throwable $e) {
            Log::warning('Voice heartbeat cache write failed', [
                'user_id' => $user->id,
                'cache_store' => config('cache.default'),
                'error' => $e->getMessage(),
            ]);

            // Do not fail agent heartbeat calls because of cache backend issues.
            return response()->json([
                'success' => true,
                'last_seen' => now()->toIso8601String(),
                'degraded' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'last_seen' => now()->toIso8601String(),
        ]);
    }

    public function missedCalls(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = max(5, min((int) $request->input('per_page', 10), 50));
        $handlingStatus = (string) $request->input('handling_status', 'all');

        try {
            $callsQuery = CallLog::with('agent:id,name')
                ->where('is_missed', true)
                ->latest('updated_at');

            if ($user && $this->isCallCenterAgent($user)) {
                $callsQuery->where(function ($query) use ($user) {
                    $query->where('agent_user_id', $user->id)
                        ->orWhereNull('agent_user_id');
                });
            }

            if ($handlingStatus === 'handled') {
                $callsQuery->where('metadata->handling_status', 'handled');
            } elseif ($handlingStatus === 'not_handled') {
                $callsQuery->where(function ($query) {
                    $query->where('metadata->handling_status', 'not_handled')
                        ->orWhereNull('metadata->handling_status');
                });
            }

            $callsPaginator = $callsQuery->paginate($perPage)->withQueryString();
            $calls = collect($callsPaginator->items())->map(function (CallLog $call) {
                $payload = $call->toArray();
                $payload['handling_status'] = $call->metadata['handling_status'] ?? 'not_handled';
                return $payload;
            })->values();

            return response()->json([
                'success' => true,
                'calls' => $calls,
                'pagination' => [
                    'current_page' => $callsPaginator->currentPage(),
                    'last_page' => $callsPaginator->lastPage(),
                    'per_page' => $callsPaginator->perPage(),
                    'total' => $callsPaginator->total(),
                ],
            ]);
        } catch (QueryException $e) {
            Log::warning('Missed calls query failed. Database might be behind migrations.', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => true,
                'calls' => [],
                'warning' => 'Call logs table is not fully migrated yet.',
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                ],
            ]);
        }
    }

    public function updateMissedCallHandlingStatus(Request $request, CallLog $call): JsonResponse
    {
        $validated = $request->validate([
            'handling_status' => 'required|in:handled,not_handled',
        ]);

        if (! $call->is_missed) {
            return response()->json([
                'success' => false,
                'error' => 'Only missed calls can be updated.',
            ], 422);
        }

        $metadata = $call->metadata ?? [];
        $metadata['handling_status'] = $validated['handling_status'];

        $call->update([
            'metadata' => $metadata,
        ]);

        return response()->json([
            'success' => true,
            'call' => [
                'id' => $call->id,
                'handling_status' => $validated['handling_status'],
            ],
        ]);
    }

    public function handleDigits(Request $request)
    {
        $digits = (string) $request->input('dtmfDigits', '');

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<Response>';

        if ($digits === '1') {
            $agent = $this->pickAvailableAgent();
            if ($agent) {
                $xml .= '<Say voice="woman">Connecting you to an available agent.</Say>';
                $xml .= '<Dial phoneNumbers="' . e($this->username() . '.' . $agent['client_name']) . '" callerId="' . e($this->callFrom()) . '" sequential="true">';
                $xml .= '<ClientId>' . e($agent['client_name']) . '</ClientId>';
                $xml .= '</Dial>';
            } else {
                $xml .= '<Say voice="woman">No agent is currently available. Please try again later.</Say>';
                $xml .= '<Hangup/>';
            }
        } elseif ($digits === '2') {
            $xml .= '<Say voice="woman">Our business hours are Monday to Friday, 9 AM to 5 PM. Thank you for calling.</Say>';
            $xml .= '<Hangup/>';
        } else {
            $xml .= '<Say voice="woman">Invalid option selected. Please try again.</Say>';
            $xml .= '<Redirect>' . e(url('/api/webhooks/voice/incoming')) . '</Redirect>';
        }

        $xml .= '</Response>';

        return response($xml, 200)->header('Content-Type', 'application/xml');
    }

    public function setDefaultAgent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:120',
        ]);

        Cache::put('default_agent', $validated['client_name'], now()->addDays(7));

        return response()->json([
            'success' => true,
            'default_agent' => $validated['client_name'],
        ]);
    }

    public function listActiveSessions(): JsonResponse
    {
        try {
            $hasStatusColumn = Schema::hasColumn('users', 'status');
            $agents = User::query()
                ->whereRaw("LOWER(TRIM(roles)) LIKE 'callcenter%'")
                ->select($hasStatusColumn ? ['id', 'name', 'email', 'roles', 'status'] : ['id', 'name', 'email', 'roles'])
                ->get()
                ->map(function (User $agent) use ($hasStatusColumn) {
                    return [
                        'id' => $agent->id,
                        'name' => $agent->name,
                        'status' => $hasStatusColumn ? $agent->status : 'offline',
                        'client_name' => Cache::get("voice_agent_client_{$agent->id}"),
                        'last_seen' => Cache::get("voice_agent_last_seen_{$agent->id}"),
                    ];
                })
                ->values();
        } catch (QueryException $e) {
            Log::warning('Failed to list active sessions', [
                'error' => $e->getMessage(),
            ]);
            $agents = collect();
        }

        return response()->json([
            'success' => true,
            'agents' => $agents,
        ]);
    }

    public function testSystem(): JsonResponse
    {
        try {
            $payload = [
                'username' => $this->username(),
                'clientName' => 'healthcheck_' . Str::lower(Str::random(6)),
                'phoneNumber' => $this->callFrom(),
            ];

            $response = Http::timeout(10)
                ->withHeaders([
                    'apiKey' => $this->apiKey(),
                    'Content-Type' => 'application/json',
                ])->post('https://webrtc.africastalking.com/capability-token/request', $payload);

            return response()->json([
                'success' => true,
                'webrtc_status' => $response->successful() ? 'ok' : 'failed',
                'provider_status_code' => $response->status(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function sessionStatus(Request $request, string $sessionId): JsonResponse
    {
        $call = CallLog::query()
            ->where('session_id', $sessionId)
            ->orWhere('provider_session_id', $sessionId)
            ->latest()
            ->first();

        if (! $call) {
            return response()->json([
                'success' => false,
                'error' => 'Call session not found.',
            ], 404);
        }

        $providerState = (string) ($call->metadata['provider_end_state'] ?? '');
        if ($providerState === '') {
            $providerState = strtolower(trim((string) ($call->metadata['status_callback']['callSessionState'] ?? '')));
        }

        $providerError = (string) ($call->metadata['provider_error'] ?? '');
        if ($providerError === '') {
            $providerError = (string) ($call->metadata['exception'] ?? '');
        }

        $message = match ($providerState) {
            'busy' => 'Client line is busy.',
            'notanswered', 'noanswer' => 'Client did not answer.',
            'rejected' => 'Call was rejected by client.',
            'unavailable' => 'Client is unavailable.',
            'manual_end' => 'Call ended by agent.',
            'failed' => $providerError !== '' ? $providerError : 'Call failed before connection.',
            default => null,
        };

        if ($message === null) {
            $message = match ($call->status) {
                'failed' => $providerError !== '' ? $providerError : 'Call failed before connection.',
                'missed' => 'Call was not answered.',
                'completed' => 'Call ended.',
                default => null,
            };
        }

        return response()->json([
            'success' => true,
            'status' => $call->status,
            'provider_state' => $providerState ?: null,
            'message' => $message,
            'answered_at' => optional($call->answered_at)?->toIso8601String(),
            'ended_at' => optional($call->ended_at)?->toIso8601String(),
        ]);
    }

  private function handleInboundCallback(
    string $sessionId,
    bool $isActive,
    string $callSessionState,
    string $callerNumber,
    string $destinationNumber
) {
    Log::info('Handling inbound callback', [
        'sessionId' => $sessionId,
        'isActive' => $isActive,
        'callSessionState' => $callSessionState,
        'callerNumber' => $callerNumber,
        'destinationNumber' => $destinationNumber,
    ]);

    $call = CallLog::firstOrCreate(
        ['provider_session_id' => $sessionId],
        [
            'session_id' => 'inbound_' . $sessionId,
            'provider_session_id' => $sessionId,
            'direction' => 'inbound',
            'from_number' => $callerNumber,
            'to_number' => $destinationNumber ?: $this->callFrom(),
            'status' => 'initiated',
            'started_at' => now(),
        ]
    );

    // FIX: When call is not active, just return hangup - don't try to play messages
    if (! $isActive) {
        if (! $call->answered_at) {
            $call->update([
                'status' => 'missed',
                'is_missed' => true,
                'ended_at' => now(),
            ]);
        }
        
        // Return empty response or hangup for inactive calls
        return $this->xmlResponse('<Response><Hangup/></Response>');
    }

    // Only try to find an agent and play messages when call IS active
    $agent = $this->pickAvailableAgent();

    if (! $agent) {
        Log::warning('Inbound call has no available mapped agent', [
            'sessionId' => $sessionId,
            'callerNumber' => $callerNumber,
        ]);

        $call->update([
            'status' => 'missed',
            'is_missed' => true,
            'ended_at' => now(),
            'metadata' => array_merge($call->metadata ?? [], ['miss_reason' => 'no_available_agent']),
        ]);

        // Play the unavailable message for active calls with no agents
        return $this->unavailableAgentResponseXml(
            'Thanks for reaching Realdeal Logistics. Our team is busy helping other customers right now. Please hold or try again in a few minutes.'
        );
    }

    Log::info('Inbound call assigned to agent', [
        'sessionId' => $sessionId,
        'agent_user_id' => $agent['user']->id,
        'agent_name' => $agent['user']->name,
        'client_name' => $agent['client_name'],
    ]);

    $call->update([
        'status' => 'ringing',
        'agent_user_id' => $agent['user']->id,
        'agent_client_name' => $agent['client_name'],
        'metadata' => array_merge($call->metadata ?? [], ['selected_agent' => $agent['user']->name]),
    ]);

    $this->setAgentStatusIfExists($agent['user']->id, 'busy');

    // When agent is available, connect them (remove voice="woman" to match docs)
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<Response>';
    $xml .= '<Say>Connecting you to an available agent.</Say>';
    $xml .= '<Dial phoneNumbers="' . e($this->username() . '.' . $agent['client_name']) . '" callerId="' . e($this->callFrom()) . '" sequential="true">';
    $xml .= '<ClientId>' . e($agent['client_name']) . '</ClientId>';
    $xml .= '</Dial>';
    $xml .= '</Response>';

    return $this->xmlResponse($xml);
}
    private function handleOutboundCallback(
        string $sessionId,
        bool $isActive,
        string $callSessionState,
        string $callerNumber,
        string $destinationNumber
    ) {
        $callerNormalized = $this->normalizePhone($callerNumber);
        $destinationNormalized = $this->normalizePhone($destinationNumber);

        $outboundSessionId = Cache::get("active_outbound_{$callerNumber}")
            ?: Cache::get("active_outbound_{$callerNormalized}")
            ?: Cache::get("active_outbound_{$destinationNumber}")
            ?: Cache::get("active_outbound_{$destinationNormalized}");

        if (! $outboundSessionId) {
            $call = CallLog::where('provider_session_id', $sessionId)->latest()->first();

            // Cache can miss in production; resolve the most recent outbound call from DB.
            if (! $call) {
                $candidateNumbers = array_values(array_filter(array_unique([
                    $callerNumber,
                    $callerNormalized,
                    $destinationNumber,
                    $destinationNormalized,
                ])));

                $call = CallLog::query()
                    ->where('direction', 'outbound')
                    ->where('started_at', '>=', now()->subMinutes(30))
                    ->where(function ($query) use ($candidateNumbers) {
                        foreach ($candidateNumbers as $number) {
                            $query->orWhere('to_number', $number)
                                ->orWhere('from_number', $number);
                        }
                    })
                    ->latest('created_at')
                    ->first();
            }

            if (! $call) {
                $call = CallLog::create([
                    'session_id' => 'outbound_' . $sessionId,
                    'provider_session_id' => $sessionId,
                    'direction' => 'outbound',
                    'from_number' => $this->callFrom(),
                    'to_number' => $callerNumber ?: $destinationNumber,
                    'status' => 'initiated',
                    'started_at' => now(),
                ]);
            } else {
                $call->update([
                    'provider_session_id' => $sessionId,
                ]);
            }

            $providerState = strtolower(trim($callSessionState));
            $endedStates = ['completed', 'failed', 'notanswered', 'busy', 'rejected', 'unavailable', 'noanswer'];

            if (! $isActive && in_array($providerState, $endedStates, true)) {
                $call->update([
                    'status' => $this->mapProviderStateToStatus($providerState),
                    'ended_at' => now(),
                    'duration_seconds' => $this->resolveDurationSeconds($call, (int) $call->duration_seconds, now()),
                    'metadata' => array_merge($call->metadata ?? [], [
                        'provider_end_state' => $providerState,
                    ]),
                ]);
            }

            if (! $isActive) {
                return $this->xmlResponse('<Response><Hangup/></Response>');
            }

            $clientName = (string) ($call->agent_client_name ?? '');
            if ($clientName === '' && $call->agent_user_id) {
                $clientName = (string) Cache::get("voice_agent_client_{$call->agent_user_id}", '');
            }

            if ($clientName === '') {
                Log::warning('Outbound callback has no mapped client name', [
                    'sessionId' => $sessionId,
                    'call_log_id' => $call->id,
                    'callerNumber' => $callerNumber,
                    'destinationNumber' => $destinationNumber,
                ]);
                return $this->xmlResponse('<Response><Hangup/></Response>');
            }

            $call->update([
                'status' => 'connected',
                'answered_at' => $call->answered_at ?? now(),
            ]);

            if ($call->agent_user_id) {
                $this->setAgentStatusIfExists($call->agent_user_id, 'on_call');
            }

            $xml = '<?xml version="1.0" encoding="UTF-8"?>';
            $xml .= '<Response>';
            $xml .= '<Dial phoneNumbers="' . e($this->username() . '.' . $clientName) . '" callerId="' . e($this->callFrom()) . '" sequential="true">';
            $xml .= '<ClientId>' . e($clientName) . '</ClientId>';
            $xml .= '</Dial>';
            $xml .= '</Response>';

            return $this->xmlResponse($xml);
        }

        $outboundInfo = Cache::get("outbound_call_{$outboundSessionId}");
        $call = CallLog::where('session_id', $outboundSessionId)->latest()->first();

        if ($call) {
            $call->provider_session_id = $sessionId;
            $call->save();
        }

        if (! $outboundInfo || ! $call) {
            return $this->xmlResponse('<Response><Hangup/></Response>');
        }

        if ($isActive) {
            $clientName = $outboundInfo['client_name'];

            $call->update([
                'status' => 'connected',
                'answered_at' => $call->answered_at ?? now(),
            ]);

            if ($call->agent_user_id) {
                $this->setAgentStatusIfExists($call->agent_user_id, 'on_call');
            }

            $xml = '<?xml version="1.0" encoding="UTF-8"?>';
            $xml .= '<Response>';
            $xml .= '<Dial phoneNumbers="' . e($this->username() . '.' . $clientName) . '" callerId="' . e($this->callFrom()) . '" sequential="true">';
            $xml .= '<ClientId>' . e($clientName) . '</ClientId>';
            $xml .= '</Dial>';
            $xml .= '</Response>';

            return $this->xmlResponse($xml);
        }

        $providerState = strtolower(trim($callSessionState));
        $endedStates = ['completed', 'failed', 'notanswered', 'busy', 'rejected', 'unavailable', 'noanswer'];
        if (in_array($providerState, $endedStates, true)) {
            $call->update([
                'status' => $this->mapProviderStateToStatus($providerState),
                'ended_at' => now(),
                'duration_seconds' => $this->resolveDurationSeconds($call, (int) $call->duration_seconds, now()),
                'metadata' => array_merge($call->metadata ?? [], [
                    'provider_end_state' => $providerState,
                ]),
            ]);

            if ($call->agent_user_id) {
                $this->setAgentStatusIfExists($call->agent_user_id, 'available');
            }

            Cache::forget("outbound_call_{$outboundSessionId}");
            Cache::forget("active_outbound_{$callerNumber}");
            Cache::forget("active_outbound_{$callerNormalized}");
            Cache::forget("active_outbound_{$destinationNumber}");
            Cache::forget("active_outbound_{$destinationNormalized}");
        }

        return $this->xmlResponse('<Response><Hangup/></Response>');
    }

    private function pickAvailableAgent(): ?array
    {
        $agents = User::query()
            ->where(function ($query) {
                $query->whereRaw("LOWER(TRIM(roles)) LIKE 'callcenter%'")
                    ->orWhereRaw("LOWER(TRIM(roles)) = 'agent'")
                    ->orWhereRaw("LOWER(TRIM(roles)) LIKE '%agent%'");
            })
            ->whereRaw("LOWER(TRIM(status)) = 'available'")
            ->orderBy('id')
            ->get();

        Log::info('Available agent candidates for inbound routing', [
            'count' => $agents->count(),
            'agents' => $agents->map(fn (User $agent) => [
                'id' => $agent->id,
                'name' => $agent->name,
                'role' => $agent->roles,
                'status' => $agent->status,
                'mapped_client' => Cache::get("voice_agent_client_{$agent->id}"),
            ])->values()->all(),
        ]);

        $readyAgents = $agents
            ->map(function (User $agent) {
                $clientName = Cache::get("voice_agent_client_{$agent->id}");
                if (! $clientName) {
                    return null;
                }

                return [
                    'user' => $agent,
                    'client_name' => $clientName,
                ];
            })
            ->filter()
            ->values();

        if ($readyAgents->isEmpty()) {
            Log::warning('No ready agents after mapping filter', [
                'available_candidates' => $agents->pluck('id')->values()->all(),
            ]);
            return null;
        }

        $index = (int) Cache::get('voice_rr_index', 0);
        $selected = $readyAgents[$index % $readyAgents->count()];
        Cache::put('voice_rr_index', $index + 1, now()->addDay());

        return $selected;
    }

    private function setAgentStatusIfExists(int $userId, string $status): void
    {
        if (! in_array($status, self::AGENT_STATUSES, true)) {
            return;
        }

        User::query()->where('id', $userId)->update(['status' => $status]);
    }

    private function mapProviderStateToStatus(string $providerState): string
    {
        return match ($providerState) {
            'initiated', 'queued' => 'initiated',
            'ringing' => 'ringing',
            'active', 'answered', 'connected' => 'connected',
            'completed', 'ended' => 'completed',
            'busy', 'rejected', 'notanswered', 'noanswer', 'unavailable' => 'failed',
            default => 'failed',
        };
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/\D+/', '', $phone) ?: '';
        if ($phone === '') {
            return '';
        }

        if (Str::startsWith($phone, '254')) {
            return '+' . $phone;
        }

        if (Str::startsWith($phone, '0')) {
            return '+254' . substr($phone, 1);
        }

        if (strlen($phone) === 9) {
            return '+254' . $phone;
        }

        return '+' . $phone;
    }

    private function isCallCenterAgent(User $user): bool
    {
        $role = Str::lower(trim((string) $user->roles));
        return (bool) preg_match('/^callcenter[0-9]*$/', $role);
    }

    private function apiKey(): ?string
    {
        return config('services.africastalking.key') ?: env('AFRICASTALKING_API_KEY');
    }

    private function username(): string
    {
        $username = config('services.africastalking.username');

        if (is_string($username) && $username !== '') {
            return $username;
        }

        return 'rdlcallcenter';
    }

    private function callFrom(): string
    {
        $callFrom = env('AFRICASTALKING_CALL_FROM');

        if (is_string($callFrom) && $callFrom !== '') {
            return $callFrom;
        }

        return '+254709369980';
    }

 private function xmlResponse(string $xml)
{
    // Africa's Talking callback handlers expect text/plain responses with XML content
    return response($xml, 200)
        ->header('Content-Type', 'text/plain; charset=utf-8');
}
private function unavailableAgentResponseXml(string $message)
{
    $normalizedMessage = trim($message) !== ''
        ? trim($message)
        : 'Thanks for reaching Realdeal Logistics. Our team is busy helping other customers right now. Please hold or try again in a few minutes.';

    // Compose the response exactly as shown in the documentation
    $response = '<?xml version="1.0" encoding="UTF-8"?>';
    $response .= '<Response>';
    $response .= '<Say>' . $normalizedMessage . '</Say>';
    $response .= '</Response>';

    Log::info('Inbound unavailable XML response emitted', [
        'message' => $normalizedMessage,
        'xml' => $response
    ]);

    // Use text/plain as shown in the documentation
    return response($response, 200)
        ->header('Content-Type', 'text/plain; charset=utf-8');
}

    private function resolveDurationSeconds(CallLog $call, int $reportedSeconds = 0, $endedAt = null): int
    {
        $duration = max($reportedSeconds, (int) $call->duration_seconds);
        $start = $call->answered_at ?? $call->started_at;
        $end = $endedAt ?? $call->ended_at ?? now();

        if ($start && $end) {
            $computed = (int) $start->diffInSeconds($end, false);
            $duration = max($duration, max(0, $computed));
        }

        return $duration;
    }
}
