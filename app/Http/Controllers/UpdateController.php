<?php

namespace App\Http\Controllers;

use App\Models\SheetOrder;
use App\Models\Update;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class UpdateController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
        return Inertia::render('updates/index', [
            'updates' => SheetOrder::whereNotNull('updated_at')->get(),

        ]);
    }

    public function run(): JsonResponse
    {
        Artisan::call('orders:update-sheets');

        return response()->json([
            'success' => true,
            'message' => 'Sheet update command started',
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
    public function show(Update $update)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Update $update)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Update $update)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Update $update)
    {
        //
    }
}
