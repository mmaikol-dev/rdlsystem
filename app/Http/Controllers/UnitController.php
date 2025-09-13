<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Psy\Util\Str;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $units = Unit::all(); // fetch all units
        return Inertia::render('units/index', [
            'units' => $units
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('units/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'short_code' => 'required|string|max:50',
        ]);

        Unit::create([
            'user_id' => auth()->id(),
            'name' => $request->name,
            'short_code' => $request->short_code,
            'slug' => \Str::slug($request->name),
        ]);

        return redirect()->route('units.index')->with('success', 'Unit created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Unit $unit)
    {
        return Inertia::render('units/edit', [
            'unit' => $unit
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Unit $unit)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'short_code' => 'required|string|max:50',
        ]);
    
        $unit->update([
            'name' => $request->name,
            'short_code' => $request->short_code,
            'slug' => \Str::slug($request->name),
        ]);
    
        return back()->with('success', 'Unit updated successfully.');
    }
    
    public function destroy(Unit $unit)
    {
        $unit->delete();
        return back()->with('success', 'Unit deleted successfully.');
    }
}
