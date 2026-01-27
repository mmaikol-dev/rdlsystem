<?php

namespace App\Http\Controllers;

use App\Models\Requisition;
use App\Models\RequisitionItem;
use App\Models\DailyBudget;
use App\Models\BudgetTransaction;
use App\Models\RequisitionCategory;
use App\Models\User;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequisitionController extends Controller
{
    public function index(Request $request)
    {
        $query = Requisition::with(['category', 'user', 'items', 'dailyBudget']);

        // Filter by status - only if not empty
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by category - only if not empty
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by date range - only if not empty
        if ($request->filled('date_from')) {
            $query->whereDate('requisition_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('requisition_date', '<=', $request->date_to);
        }

        // Filter by priority - only if not empty
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        // Search functionality - only if not empty
        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                  ->orWhere('requisition_number', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        $requisitions = $query->latest()->paginate(15);

        // Fetch categories from requisition_categories table
        $categories = RequisitionCategory::all();
        
        // Fetch all users for dropdown
        $users = User::select('id', 'name', 'email')->get();

        return Inertia::render('requisitions/index', [
            'requisitions' => $requisitions,
            'categories' => $categories,
            'users' => $users,
            'filters' => [
                'status' => $request->status,
                'category_id' => $request->category_id,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'priority' => $request->priority,
                'search' => $request->search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'category_id' => 'required|exists:requisition_categories,id',
                'user_id' => 'required|exists:users,id',
                'description' => 'nullable|string',
                'requisition_date' => 'required|date',
                'items' => 'required|array|min:1',
                'items.*.item_name' => 'required|string',
                'items.*.description' => 'nullable|string',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.unit_price' => 'required|numeric|min:0',
            ]);

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $totalAmount += $item['quantity'] * $item['unit_price'];
            }

            // Get the selected user's name for the title
            $selectedUser = User::find($request->user_id);

            $requisition = Requisition::create([
                'category_id' => $request->category_id,
                'user_id' => auth()->id(),
                'title' => $selectedUser->name, // Use selected user's name as title
                'description' => $request->description,
                'total_amount' => $totalAmount,
                'requisition_date' => $request->requisition_date,
                'status' => 'pending',
            ]);

            foreach ($request->items as $item) {
                $requisition->items()->create([
                    'item_name' => $item['item_name'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                ]);
            }

            return redirect()->route('requisitions.index')
                ->with('success', 'Requisition created successfully');

        } catch (\Exception $e) {
            Log::error('Failed to create requisition', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()
                ->with('error', 'Error creating requisition: ' . $e->getMessage());
        }
    }

    public function show(Requisition $requisition)
    {
        return Inertia::render('requisitions/show', [
            'requisition' => $requisition->load(['category', 'user', 'items', 'dailyBudget', 'approver'])
        ]);
    }

    public function updateItem(Request $request, Requisition $requisition, RequisitionItem $item)
    {
        // Only allow editing if requisition is still pending
        if ($requisition->status !== 'pending') {
            return back()->withErrors(['message' => 'Cannot edit items of a requisition that is not pending']);
        }

        // Verify the item belongs to this requisition
        if ($item->requisition_id !== $requisition->id) {
            return back()->withErrors(['message' => 'Item does not belong to this requisition']);
        }

        try {
            $validated = $request->validate([
                'item_name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'quantity' => 'required|integer|min:1',
                'unit_price' => 'required|numeric|min:0',
            ]);

            DB::beginTransaction();

            // Update the item
            $item->update([
                'item_name' => $validated['item_name'],
                'description' => $validated['description'],
                'quantity' => $validated['quantity'],
                'unit_price' => $validated['unit_price'],
                'total_price' => $validated['quantity'] * $validated['unit_price'],
            ]);

            // Recalculate requisition total
            $newTotal = $requisition->items()->sum(DB::raw('quantity * unit_price'));
            $requisition->update(['total_amount' => $newTotal]);

            DB::commit();

            return back()->with('success', 'Item updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update requisition item', [
                'requisition_id' => $requisition->id,
                'item_id' => $item->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors(['message' => 'Error updating item: ' . $e->getMessage()]);
        }
    }

    public function updateStatus(Request $request, Requisition $requisition)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,rejected,paid',
        ]);

        try {
            DB::beginTransaction();

            $oldStatus = $requisition->status;
            $requisition->status = $request->status;

            if ($request->status === 'approved') {
                $requisition->approved_at = now();
                $requisition->approved_by = auth()->id();
            }

            if ($request->status === 'paid') {
                $budget = DailyBudget::whereDate('budget_date', $requisition->requisition_date)->first();

                if (!$budget) {
                    DB::rollBack();
                    return back()->withErrors(['message' => 'No budget found for this date']);
                }

                if ($budget->current_amount < $requisition->total_amount) {
                    DB::rollBack();
                    return back()->withErrors(['message' => 'Insufficient budget']);
                }

                $balanceBefore = $budget->current_amount;
                $budget->deductAmount($requisition->total_amount);

                BudgetTransaction::create([
                    'daily_budget_id' => $budget->id,
                    'type' => 'deduction',
                    'amount' => $requisition->total_amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $budget->current_amount,
                    'reference_type' => 'Requisition',
                    'reference_id' => $requisition->id,
                    'description' => "Payment for requisition {$requisition->requisition_number}",
                    'created_by' => auth()->id(),
                ]);

                $requisition->daily_budget_id = $budget->id;
                $requisition->paid_at = now();
            }

            $requisition->save();

            DB::commit();

            // Return back with success message instead of JSON
            return back()->with('success', 'Requisition status updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update requisition status', [
                'requisition_id' => $requisition->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return back()->withErrors(['message' => 'Error updating status: ' . $e->getMessage()]);
        }
    }

    public function destroy(Requisition $requisition)
    {
        if ($requisition->status === 'paid') {
            return back()->withErrors(['message' => 'Cannot delete paid requisition']);
        }

        try {
            $requisition->delete();
            return redirect()->route('requisitions.index')
                ->with('success', 'Requisition deleted successfully');
        } catch (\Exception $e) {
            Log::error('Failed to delete requisition', [
                'requisition_id' => $requisition->id,
                'error' => $e->getMessage(),
            ]);
            
            return back()->withErrors(['message' => 'Error deleting requisition']);
        }
    }
}