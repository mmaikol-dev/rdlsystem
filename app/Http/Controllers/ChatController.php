<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\Whatsapp;
use Illuminate\Container\Attributes\DB;
use Illuminate\Http\Request;
use Inertia\Inertia;



class ChatController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    private function normalizePhoneNumber($phone)
    {
        $phone = preg_replace('/\D/', '', $phone); // keep digits only

        // Remove leading zero
        if (substr($phone, 0, 1) === '0') {
            $phone = substr($phone, 1);
        }

        // If starts with 254 keep it, else prefix
        if (substr($phone, 0, 3) !== '254') {
            $phone = '254' . $phone;
        }

        return '+' . $phone;
    }

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15); // Default 15 conversations per page
        $currentPage = $request->get('page', 1);
    
        // Get all chats to maintain grouping functionality
        $rawChats = Chat::orderBy('created_at', 'asc')->get();
    
        $groupedChats = [];
    
        foreach ($rawChats as $chat) {
            $normalized = $this->normalizePhoneNumber($chat->to);
    
            if (!isset($groupedChats[$normalized])) {
                $groupedChats[$normalized] = [
                    'phone' => $normalized,
                    'client_name' => $chat->client_name,
                    'store_name' => $chat->store_name,
                    'messages' => [],
                    'latest_at' => null,
                ];
            }
    
            $groupedChats[$normalized]['messages'][] = $chat;
    
            // Track the latest timestamp for sorting
            $groupedChats[$normalized]['latest_at'] = $chat->created_at;
        }
    
        // Sort conversations by latest_at (newest first)
        $sortedConversations = collect($groupedChats)
            ->sortByDesc('latest_at')
            ->values();
    
        // Manual pagination for the conversations
        $total = $sortedConversations->count();
        $offset = ($currentPage - 1) * $perPage;
        
        $paginatedConversations = $sortedConversations->slice($offset, $perPage)->values();
    
        // Create pagination metadata
        $pagination = [
            'current_page' => (int) $currentPage,
            'per_page' => (int) $perPage,
            'total' => $total,
            'last_page' => ceil($total / $perPage),
            'from' => $total > 0 ? $offset + 1 : 0,
            'to' => min($offset + $perPage, $total),
            'has_more_pages' => $currentPage < ceil($total / $perPage),
            'prev_page_url' => $currentPage > 1 ? request()->fullUrlWithQuery(['page' => $currentPage - 1]) : null,
            'next_page_url' => $currentPage < ceil($total / $perPage) ? request()->fullUrlWithQuery(['page' => $currentPage + 1]) : null,
        ];
    
        return Inertia::render('whatsapp/index', [
            'conversations' => $paginatedConversations->toArray(),
            'pagination' => $pagination,
        ]);
    } 
    
    
    public function getConversations(Request $request)
{
    $perPage = $request->get('per_page', 15);
    $currentPage = $request->get('page', 1);

    // Get all chats to maintain grouping functionality
    $rawChats = Chat::orderBy('created_at', 'asc')->get();

    $groupedChats = [];

    foreach ($rawChats as $chat) {
        $normalized = $this->normalizePhoneNumber($chat->to);

        if (!isset($groupedChats[$normalized])) {
            $groupedChats[$normalized] = [
                'phone' => $normalized,
                'client_name' => $chat->client_name,
                'store_name' => $chat->store_name,
                'messages' => [],
                'latest_at' => null,
            ];
        }

        $groupedChats[$normalized]['messages'][] = $chat;

        // Track the latest timestamp for sorting
        $groupedChats[$normalized]['latest_at'] = $chat->created_at;
    }

    // Sort conversations by latest_at (newest first)
    $sortedConversations = collect($groupedChats)
        ->sortByDesc('latest_at')
        ->values();

    // Manual pagination for the conversations
    $total = $sortedConversations->count();
    $offset = ($currentPage - 1) * $perPage;
    
    $paginatedConversations = $sortedConversations->slice($offset, $perPage)->values();

    // Create pagination metadata
    $pagination = [
        'current_page' => (int) $currentPage,
        'per_page' => (int) $perPage,
        'total' => $total,
        'last_page' => ceil($total / $perPage),
        'from' => $total > 0 ? $offset + 1 : 0,
        'to' => min($offset + $perPage, $total),
        'has_more_pages' => $currentPage < ceil($total / $perPage),
        'prev_page_url' => $currentPage > 1 ? request()->fullUrlWithQuery(['page' => $currentPage - 1]) : null,
        'next_page_url' => $currentPage < ceil($total / $perPage) ? request()->fullUrlWithQuery(['page' => $currentPage + 1]) : null,
    ];

    return response()->json([
        'conversations' => $paginatedConversations->toArray(),
        'pagination' => $pagination,
    ]);
}

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */public function show($phone)
{
    $messages = \DB::table('whatsapp')
        ->where('to', $phone)
        ->orWhere('from', $phone)
        ->orderBy('created_at', 'asc')
        ->get();

    return response()->json($messages);
}


    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Chat $chat)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updateStatus(Request $request, $phone)
    {
        $request->validate([
            'type' => 'required|in:0,1',
        ]);

        // Update all messages for this phone number
        Whatsapp::where('to', $phone)->update([
            'type' => $request->type,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Chat updated successfully',
        ]);
    }

    

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Chat $chat)
    {
        //
    }
}
