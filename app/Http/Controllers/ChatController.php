<?php

namespace App\Http\Controllers;

use App\Models\Chat;
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

    public function index()
    {
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
        $sorted = collect($groupedChats)
            ->sortByDesc('latest_at')
            ->values()
            ->toArray();
    
        return Inertia::render('whatsapp/index', [
            'conversations' => $sorted,
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
     */
    public function show(Chat $chat)
    {
        //
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
    public function update(Request $request, Chat $chat)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Chat $chat)
    {
        //
    }
}
