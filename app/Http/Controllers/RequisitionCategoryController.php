<?php

namespace App\Http\Controllers;

use App\Models\RequisitionCategory;
use Illuminate\Http\Request;
use App\Models\Requisition;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RequisitionCategoryController extends Controller
{
    public function index()
    {
        $categories = RequisitionCategory::withCount('requisitions')
            ->orderBy('name')
            ->get();

        return Inertia::render('reqcategories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:requisition_categories,name',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        RequisitionCategory::create($request->all());

        return redirect()->route('reqcategories.index')
            ->with('success', 'Category created successfully');
    }

    public function update(Request $request, RequisitionCategory $category)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:requisition_categories,name,' . $category->id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($request->all());

        return redirect()->route('reqcategories.index')
            ->with('success', 'Category updated successfully');
    }

    public function destroy(RequisitionCategory $category)
    {
        // Using the relationship without parentheses for better error handling
        if ($category->requisitions->count() > 0) {
            return redirect()->back()
                ->withErrors(['error' => 'Cannot delete category with existing requisitions']);
        }

        $category->delete();

        return redirect()->route('reqcategories.index')
            ->with('success', 'Category deleted successfully');
    }
}