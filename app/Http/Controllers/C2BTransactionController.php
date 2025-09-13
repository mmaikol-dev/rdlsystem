<?php

namespace App\Http\Controllers;

use App\Models\C2BTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class C2BTransactionController extends Controller
{
    /**
     * Show paginated transactions (for your Inertia frontend).
     */
    public function index(Request $request)
{
    $query = C2BTransaction::query();

    // ✅ Search by transaction_id, account_number, or payer_phone
    if ($request->filled('search')) {
        $search = $request->input('search');
        $query->where(function ($q) use ($search) {
            $q->where('transaction_id', 'like', "%{$search}%")
              ->orWhere('account_number', 'like', "%{$search}%")
              ->orWhere('payer_phone', 'like', "%{$search}%");
        });
    }

    // ✅ Filter by status (processed/pending)
    if ($request->filled('status')) {
        if ($request->status === 'processed') {
            $query->where('processed', true);
        } elseif ($request->status === 'pending') {
            $query->where('processed', false);
        }
    }

    // ✅ Filter by date range
    if ($request->filled('start_date')) {
        $query->whereDate('created_at', '>=', $request->start_date);
    }
    if ($request->filled('end_date')) {
        $query->whereDate('created_at', '<=', $request->end_date);
    }

    // ✅ Pagination + keep filters across pages
    $transactions = $query->orderBy('created_at', 'desc')
        ->paginate(100)
        ->withQueryString();

    return Inertia::render('transactions/index', [
        'transactions' => $transactions,
        'filters' => $request->only(['search', 'status', 'start_date', 'end_date']),
    ]);
}


    /**
     * This is the callback Safaricom will POST to
     */
    public function confirmTransaction(Request $request)
    {
        Log::info('M-Pesa C2B Callback Received:', $request->all());

        $transId       = $request->input('TransID');
        $billRefNumber = $request->input('BillRefNumber');
        $transAmount   = $request->input('TransAmount');
        $msisdn        = $request->input('MSISDN');

        // Extra log for debugging
        Log::info('Parsed Transaction:', [
            'TransID'       => $transId,
            'BillRefNumber' => $billRefNumber,
            'TransAmount'   => $transAmount,
            'MSISDN'        => $msisdn,
        ]);

        if (!$transId || !$billRefNumber || !$transAmount || !$msisdn) {
            Log::error('Missing required fields from Safaricom');
            return response()->json([
                'ResultCode' => 1,
                'ResultDesc' => 'Missing required fields'
            ]);
        }

        try {
            // Prevent duplicates
            C2BTransaction::updateOrCreate(
                ['transaction_id' => $transId],
                [
                    'account_number' => $billRefNumber,
                    'amount'         => $transAmount,
                    'payer_phone'    => $msisdn,
                ]
            );

            Log::info("Transaction {$transId} saved successfully.");
        } catch (\Exception $e) {
            Log::error('Error saving transaction: ' . $e->getMessage());
            return response()->json([
                'ResultCode' => 1,
                'ResultDesc' => 'Database save error'
            ]);
        }

        // Response back to Safaricom (very important!)
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Success'
        ]);
    }

    /**
     * Store manually via form.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_id' => 'required|string|unique:c2b_transactions,transaction_id',
            'account_number' => 'required|string',
            'amount'         => 'required|numeric|min:0',
            'payer_phone'    => 'required|string',
            'processed'      => 'boolean',
        ]);

        C2BTransaction::create($validated);

        return redirect()->route('transactions.index')
            ->with('success', 'Transaction created successfully.');
    }

    /**
     * Update manually.
     */
    public function update(Request $request, C2BTransaction $transaction)
    {
        $validated = $request->validate([
            'account_number' => 'required|string',
            'amount'         => 'required|numeric|min:0',
            'payer_phone'    => 'required|string',
            'processed'      => 'boolean',
        ]);

        $transaction->update($validated);

        return redirect()->route('transactions.index')
            ->with('success', 'Transaction updated successfully.');
    }

    /**
     * Delete transaction.
     */
    public function destroy(C2BTransaction $transaction)
    {
        $transaction->delete();

        return redirect()->route('transactions.index')
            ->with('success', 'Transaction deleted successfully.');
    }
}
