<?php

namespace App\Http\Controllers;

use App\Models\Sheet;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Google\Service\Sheets\Sheet as SheetsSheet;
use Google_Service_Sheets;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Google_Service_Sheets_ValueRange;
use Google_Service_Sheets_BatchUpdateSpreadsheetRequest;
use Google_Service_Sheets_Request;
use Revolution\Google\Sheets\Facades\Sheets;
use Google_Client;



class SheetController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
{
    $query = Sheet::select(
        'id',
        'sheet_id',
        'sheet_name',
        'shopify_name',
        'access_token',
        'country',
        'cc_agents',
        'sku'
    );

    // If logged-in user is a merchant, filter sheets by matching user name with sheet_name
    if (auth()->user()->roles === 'merchant') {
        $query->where('sheet_name', auth()->user()->name);
    }

    $sheets = $query->get();

    return Inertia::render('sheets/index', [
        'sheets' => $sheets,
    ]);
}



    public function viewSheetData($sheetId)
    {
        try {
            $client = new \Google_Client();
            $client->setAuthConfig(storage_path('project-423911-84ac0fbdde59.json'));
            $client->addScope(\Google_Service_Sheets::SPREADSHEETS);
            $service = new \Google_Service_Sheets($client);
    
            $spreadsheet = $service->spreadsheets->get($sheetId);
            $availableSheets = array_map(fn($sheet) => $sheet->properties->title, $spreadsheet->sheets);
    
            // Default to first sheet
            $sheetName = $availableSheets[0];
            $range = $sheetName . '!A1:R1000';
            $sheetData = $service->spreadsheets_values->get($sheetId, $range)->getValues();
    
            return response()->json([
                'availableSheets' => $availableSheets,
                'sheetData' => $sheetData
            ]);
    
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch sheet data',
                'message' => $e->getMessage()
            ], 500);
        }
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
        $request->validate([
            'sheet_id'      => 'required|string|unique:sheets,sheet_id',
            'sheet_name'    => 'required|string',
            'shopify_name'  => 'nullable|string',
            'access_token'  => 'nullable|string',
            'country'       => 'nullable|string',
            'cc_agents'     => 'nullable|string',
            'sku'           => 'nullable|string',
        ]);

        Sheet::create($request->all());

        return redirect()->back()->with('success', 'Sheet created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Sheet $sheet)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Sheet $sheet)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Sheet $sheet)
    {
        $validated = $request->validate([
            'sheet_name' => 'required|string|max:255',
            'sheet_id' => 'required|string|max:255',
            'shopify_name' => 'nullable|string|max:255',
            'access_token' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:100',
            'cc_agents' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255',
        ]);

        $sheet->update($validated);

        return redirect()->back()->with('success', 'Sheet updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Sheet $sheet)
    {
        $sheet->delete();

        return redirect()->back()->with('success', 'Sheet deleted successfully.');
    }
}
