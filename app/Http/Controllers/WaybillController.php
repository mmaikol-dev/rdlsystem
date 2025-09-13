<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SheetOrder;
use Barryvdh\DomPDF\Facade\Pdf;

class WaybillController extends Controller
{
    /**
     * Download the waybill PDF for a specific order.
     */
    public function download($id)
    {
        $order = SheetOrder::findOrFail($id);

        // Load the waybill Blade view and pass the order
        $pdf = Pdf::loadView('waybill', compact('order'));

        // Return the PDF for download
        return $pdf->download('waybill-' . $order->order_no . '.pdf');
    }
}
