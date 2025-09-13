<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SheetOrder;
use Inertia\Inertia;

class ImportController extends Controller
{
    public function index()
    {
        $sheets = \App\Models\Sheet::select('id', 'sheet_id', 'sheet_name', 'store_name', 'country')->get();

        return Inertia::render('import/index', [
            'sheets' => $sheets,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls',
            'sheet_id' => 'required|string',
            'sheet_name' => 'required|string',
            'store_name' => 'required|string',
            'country' => 'required|string',
            'merchant' => 'required|string',
        ]);
    
        $file = $request->file('file');
        $path = $file->getRealPath();
    
        // Open CSV file
        if (($handle = fopen($path, 'r')) !== false) {
            $header = fgetcsv($handle, 1000, ','); // read first row as header
    
            while (($row = fgetcsv($handle, 1000, ',')) !== false) {
                // Helper: convert empty string to null
                $cleanDate = function ($value) {
                    return !empty($value) ? date('Y-m-d', strtotime($value)) : null;
                };

                // Find existing order by order_no + merchant + sheet_id
                $existingOrder = SheetOrder::where('order_no', $row[1] ?? null)
                    ->where('merchant', $request->merchant)
                    ->where('sheet_id', $request->sheet_id)
                    ->first();

                $data = [
                    'order_date'    => $cleanDate($row[0] ?? null),
                    'order_no'      => $row[1] ?? null,
                    'amount'        => $row[2] ?? null,
                    'client_name'   => $row[3] ?? null,
                    'address'       => $row[4] ?? null,
                    'phone'         => $row[5] ?? null,
                    'alt_no'        => $row[6] ?? null,
                    'country'       => $row[7] ?: $request->country,
                    'city'          => $row[8] ?? null,
                    'product_name'  => $row[9] ?? null,
                    'quantity'      => $row[10] ?? null,
                    'status'        => $row[11] ?? null,
                    'delivery_date' => $cleanDate($row[12] ?? null),
                    'agent'         => $row[13] ?? null,
                    'instructions'  => $row[14] ?? null,
                    'cc_email'      => $row[15] ?? null,
                    'merchant'      => $request->merchant,
                    'code'          =>$row[17] ?? null,
                    'order_type'    => 'imported',
                    'sheet_id'      => $request->sheet_id,
                    'sheet_name'    => $request->sheet_name,
                ];

                if ($existingOrder) {
                    // Update existing record
                    $existingOrder->update($data);
                } else {
                    // Insert new record
                    SheetOrder::create($data);
                }
            }
    
            fclose($handle);
        }
    
        return response()->json(['message' => 'Orders imported/updated successfully']);
    }
}
