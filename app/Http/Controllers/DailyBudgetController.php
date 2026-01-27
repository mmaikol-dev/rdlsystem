<?php

namespace App\Http\Controllers;

use App\Models\DailyBudget;
use App\Models\BudgetTransaction;
use App\Models\BudgetTopUp;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DailyBudgetController extends Controller
{
    public function index(Request $request)
    {
        Log::info('DailyBudget index requested', [
            'user_id' => auth()->id(),
            'filters' => $request->all(),
        ]);

        $query = DailyBudget::with(['transactions', 'topUps.addedBy']);

        if ($request->has('date_from')) {
            $query->whereDate('budget_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('budget_date', '<=', $request->date_to);
        }

        $budgets = $query->orderBy('budget_date', 'desc')->get();

        Log::info('DailyBudget index loaded', [
            'count' => $budgets->count(),
        ]);

        return Inertia::render('budgets/index', [
            'budgets' => $budgets,
        ]);
    }

    public function store(Request $request)
    {
        Log::info('Creating daily budget', [
            'user_id' => auth()->id(),
            'payload' => $request->only(['budget_date', 'initial_amount']),
        ]);

        $request->validate([
            'budget_date' => 'required|date|unique:daily_budgets,budget_date',
            'initial_amount' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $budget = DailyBudget::create([
                'budget_date' => $request->budget_date,
                'initial_amount' => $request->initial_amount,
                'current_amount' => $request->initial_amount,
                'spent_amount' => 0,
            ]);

            Log::info('Daily budget created', [
                'budget_id' => $budget->id,
                'date' => $budget->budget_date,
                'amount' => $budget->initial_amount,
            ]);

            BudgetTransaction::create([
                'daily_budget_id' => $budget->id,
                'type' => 'initial',
                'amount' => $request->initial_amount,
                'balance_before' => 0,
                'balance_after' => $request->initial_amount,
                'description' => 'Initial budget setup',
                'created_by' => auth()->id(),
            ]);

            Log::info('Initial budget transaction recorded', [
                'budget_id' => $budget->id,
                'amount' => $request->initial_amount,
            ]);

            DB::commit();

            Log::info('Daily budget transaction committed successfully', [
                'budget_id' => $budget->id,
            ]);

            return redirect()->route('budgets.index')
                ->with('success', 'Daily budget created successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to create daily budget', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()
                ->with('error', 'Error creating budget: ' . $e->getMessage());
        }
    }

    public function show($id)
    {
        Log::info('Viewing daily budget', [
            'user_id' => auth()->id(),
            'budget_id' => $id,
        ]);

        $budget = DailyBudget::with(['transactions.creator', 'topUps.addedBy', 'requisitions.items'])
            ->findOrFail($id);

        return Inertia::render('budgets/show', [
            'budget' => $budget,
        ]);
    }

    public function topUp(Request $request, $id)
    {
        Log::info('Budget top-up requested', [
            'user_id' => auth()->id(),
            'budget_id' => $id,
            'payload' => $request->only(['amount', 'reason']),
        ]);

        $request->validate([
            'amount' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $budget = DailyBudget::findOrFail($id);
            $balanceBefore = $budget->current_amount;

            Log::info('Top-up before balance', [
                'budget_id' => $budget->id,
                'balance_before' => $balanceBefore,
            ]);

            $budget->addAmount($request->amount);

            Log::info('Budget amount updated', [
                'budget_id' => $budget->id,
                'added' => $request->amount,
                'balance_after' => $budget->current_amount,
            ]);

            BudgetTopUp::create([
                'daily_budget_id' => $budget->id,
                'amount' => $request->amount,
                'reason' => $request->reason,
                'added_by' => auth()->id(),
            ]);

            Log::info('Budget top-up record created', [
                'budget_id' => $budget->id,
                'amount' => $request->amount,
            ]);

            BudgetTransaction::create([
                'daily_budget_id' => $budget->id,
                'type' => 'topup',
                'amount' => $request->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $budget->current_amount,
                'description' => $request->reason ?? 'Budget top-up',
                'created_by' => auth()->id(),
            ]);

            Log::info('Top-up transaction recorded', [
                'budget_id' => $budget->id,
                'amount' => $request->amount,
            ]);

            DB::commit();

            Log::info('Budget top-up committed successfully', [
                'budget_id' => $budget->id,
            ]);

            return redirect()->back()
                ->with('success', 'Budget topped up successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to top up budget', [
                'user_id' => auth()->id(),
                'budget_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()
                ->with('error', 'Error topping up budget: ' . $e->getMessage());
        }
    }

    public function getByDate($date)
    {
        Log::info('Fetching budget by date', [
            'user_id' => auth()->id(),
            'date' => $date,
        ]);

        $budget = DailyBudget::with(['transactions.creator', 'topUps.addedBy', 'requisitions'])
            ->whereDate('budget_date', $date)
            ->first();

        if (!$budget) {
            Log::warning('No budget found for date', [
                'date' => $date,
            ]);

            return response()->json(['message' => 'No budget found for this date'], 404);
        }

        Log::info('Budget found for date', [
            'budget_id' => $budget->id,
            'date' => $date,
        ]);

        return response()->json($budget);
    }
}
