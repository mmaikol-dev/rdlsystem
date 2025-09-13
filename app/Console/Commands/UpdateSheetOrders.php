<?php

namespace App\Console\Commands;

use Illuminate\Support\Facades\Cache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Google_Client;
use Google_Service_Sheets;
use Google_Service_Sheets_ValueRange;
use App\Models\SheetOrder;
use Carbon\Carbon;

class UpdateSheetOrders extends Command
{
    protected $signature = 'orders:update-sheets';
    protected $description = 'Automatically update orders in the Google Sheet';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle()
    {
        $lock = Cache::lock('update-sheet-orders-lock', 300); // Lock for 5 minutes

        if ($lock->get()) {
            try {
                $sheetOrders = SheetOrder::whereNotNull('updated_at')->get();

                $client = new Google_Client();
                $client->setAuthConfig(storage_path('project-423911-84ac0fbdde59.json'));
                $client->addScope(Google_Service_Sheets::SPREADSHEETS);
                $service = new Google_Service_Sheets($client);

                // Special sheet with unique delivery date handling
                $specialSheetId = '1x1Rntb-_BbXe5gvWIKN3Zr2Tnbyi9rSmbaieYzUryzU';

                foreach ($sheetOrders as $sheetOrder) {
                    $spreadsheetId = $sheetOrder->sheet_id;
                    $sheetName = $sheetOrder->sheet_name;

                    // Decide mapping based on sheet layout
                    if ($spreadsheetId === $specialSheetId) {
                        $orderNoColumn = 'N';
                        $updateColumns = 'A:Q';
                        $insertRange = "{$sheetName}!A1:Q1";
                    } else {
                        $orderNoColumn = 'B';
                        $updateColumns = 'A:R';
                        $insertRange = "{$sheetName}!A1:R1";
                    }

                    try {
                        // Search for order_no in the correct column
                        $range = "'{$sheetName}'!{$orderNoColumn}1:{$orderNoColumn}10000";
                        $response = $service->spreadsheets_values->get($spreadsheetId, $range);
                        $values = $response->getValues();

                        $rowIndex = -1;
                        foreach ($values as $i => $row) {
                            if (isset($row[0]) && trim($row[0]) == $sheetOrder->order_no) {
                                $rowIndex = $i + 1;
                                break;
                            }
                        }

                        // Format dates
                        $orderDate = isset($sheetOrder->order_date) ? Carbon::parse($sheetOrder->order_date)->format('Y-m-d') : '';
                        $deliveryDate = isset($sheetOrder->delivery_date) ? Carbon::parse($sheetOrder->delivery_date)->format('Y-m-d') : '';

                        // Build values depending on sheet layout
                        if ($spreadsheetId === $specialSheetId) {
                            $rowValues = [[
                                $orderDate,                     // A: DATE
                                $sheetOrder->client_name ?? '', // B: FULL NAME
                                $sheetOrder->address ?? '',     // C: ADDRESS
                                $sheetOrder->city ?? '',        // D: CITY
                                $sheetOrder->phone ?? '',       // E: PHONE NO
                                $sheetOrder->product_name ?? '',// F: PRODUCT NAME
                                $sheetOrder->amount ?? '',      // G: AMOUNT
                                $sheetOrder->quantity ?? '',    // H: QTY
                                $sheetOrder->status ?? '',      // I: STATUS
                                ($sheetOrder->status === 'Delivered') ? $deliveryDate : '', // J: Delivered date
                                '',                             // K: PAYMENT COLLECTED
                                $sheetOrder->instructions ?? '',// L: COMMENTS
                                $sheetOrder->cc_email ?? '',    // M: CC AGENT
                                $sheetOrder->order_no ?? '',    // N: ORDERNO
                                $sheetOrder->merchant ?? '',    // O: MERCHANT
                                $sheetOrder->code ?? '',        // P: CODE
                                ($sheetOrder->status !== 'Delivered') ? $deliveryDate : '', // Q: delivery date if not Delivered
                            ]];
                        } else {
                            $rowValues = [[
                                $orderDate,                     // A: order_date
                                $sheetOrder->order_no ?? '',    // B: order_no
                                $sheetOrder->amount ?? '',      // C: amount
                                $sheetOrder->client_name ?? '', // D: client_name
                                $sheetOrder->address ?? '',     // E: address
                                $sheetOrder->phone ?? '',       // F: phone
                                $sheetOrder->alt_no ?? '',      // G: alt_no
                                $sheetOrder->country ?? '',     // H: country
                                $sheetOrder->city ?? '',        // I: city
                                $sheetOrder->product_name ?? '',// J: product_name
                                $sheetOrder->quantity ?? '',    // K: quantity
                                $sheetOrder->status ?? '',      // L: status
                                $deliveryDate,                  // M: delivery_date (always for other sheets)
                                '',                             // N: blank
                                $sheetOrder->instructions ?? '',// O: instructions
                                $sheetOrder->cc_email ?? '',    // P: cc_email
                                $sheetOrder->merchant ?? '',    // Q: merchant
                                $sheetOrder->code ?? '',        // R: code
                            ]];
                        }

                        $body = new Google_Service_Sheets_ValueRange([
                            'majorDimension' => 'ROWS',
                            'values' => $rowValues
                        ]);

                        $params = ['valueInputOption' => 'RAW'];

                        if ($rowIndex == -1) {
                            // Insert new row
                            $service->spreadsheets_values->append($spreadsheetId, $insertRange, $body, $params);
                            Log::info("Inserted new order into Google Sheet: Order No - {$sheetOrder->order_no}");
                        } else {
                            // Update existing row
                            $updateRange = "{$sheetName}!{$updateColumns}{$rowIndex}";
                            $service->spreadsheets_values->update($spreadsheetId, $updateRange, $body, $params);
                            Log::info("Updated Google Sheet for Order No: {$sheetOrder->order_no}");
                        }

                        // Mark as synced
                        $sheetOrder->updated_at = null;
                        $sheetOrder->save();

                    } catch (\Exception $e) {
                        Log::error("Error updating Google Sheet for Order No: {$sheetOrder->order_no}", [
                            'sheet_id' => $spreadsheetId,
                            'sheet_name' => $sheetName,
                            'message' => $e->getMessage(),
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Error initializing Google API client', ['message' => $e->getMessage()]);
            } finally {
                $lock->release();
            }
        } else {
            Log::info('UpdateSheetOrders command skipped to avoid overlap.');
        }

        return 0;
    }
}
