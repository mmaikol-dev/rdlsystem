<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Exports\OrdersExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function index()
    {
        $merchants = User::where('roles', 'merchant')->pluck('name');
        return Inertia::render('report/index', [
            'merchants' => $merchants,
        ]);
    }

    public function download(Request $request)
    {
        try {
            $filters = [
                'merchant' => $request->merchant,
                'statuses' => $request->statuses ?? [],
                'from' => $request->from 
        ? Carbon::parse($request->from)->timezone('Africa/Nairobi')->startOfDay()
        : null,
    'to' => $request->to
        ? Carbon::parse($request->to)->timezone('Africa/Nairobi')->endOfDay()
        : null,
            ];

            return Excel::download(new OrdersExport($filters), 'orders_report.xlsx');
        } catch (\Throwable $e) {
            \Log::error("Excel export failed: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Export failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
