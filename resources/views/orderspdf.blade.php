<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Riders Sheet</title>

    <style>
        /* RESET */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* PAGE */
        @page {
            margin: 20mm;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            background: #ffffff;
            color: #000;
            padding: 20px;
            line-height: 1.6;
        }

        /* HEADER */
        header {
            margin-bottom: 40px;
            overflow: visible;
        }

        header h1 {
            background: #024CAA;
            color: #fff;
            text-align: center;
            padding: 16px 0;
            letter-spacing: 2px;
            font-size: 16px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .header-content {
            display: table;
            width: 100%;
            border-spacing: 30px 0;
        }

        .company-info {
            display: table-cell;
            width: 55%;
            font-size: 11px;
            line-height: 1.8;
            vertical-align: top;
        }

        .company-info img {
            max-width: 180px;
            margin-bottom: 10px;
            display: block;
        }

        .company-info p {
            margin-bottom: 4px;
        }

        .meta-wrapper {
            display: table-cell;
            width: 40%;
            vertical-align: top;
        }

        /* META TABLE */
        table.meta {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #bbb;
            border-radius: 5px;
            overflow: hidden;
        }

        table.meta tr:not(:last-child) {
            border-bottom: 1px solid #bbb;
        }

        table.meta th,
        table.meta td {
            padding: 10px 12px;
            font-size: 11px;
        }

        table.meta th {
            background: #eee;
            width: 45%;
            text-align: left;
            font-weight: bold;
        }

        table.meta td {
            background: #fff;
        }

        /* INVENTORY TABLE */
        table.inventory {
            width: 100%;
            margin-top: 30px;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #ccc;
            border-radius: 5px;
            overflow: hidden;
            table-layout: fixed;
        }

        table.inventory thead {
            background: #024CAA;
        }

        table.inventory th {
            color: #fff;
            padding: 12px 10px;
            font-weight: bold;
            text-align: center;
            font-size: 11px;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
        }

        table.inventory th:last-child {
            border-right: none;
        }

        table.inventory tbody tr {
            border-bottom: 1px solid #e0e0e0;
        }

        table.inventory tbody tr:last-child {
            border-bottom: none;
        }

        table.inventory td {
            padding: 10px;
            font-size: 10.5px;
            vertical-align: top;
            word-wrap: break-word;
            border-right: 1px solid #f0f0f0;
        }

        table.inventory td:last-child {
            border-right: none;
        }

        /* COLUMN WIDTHS */
        .col-order {
            width: 9%;
        }

        .col-product {
            width: 20%;
        }

        .col-qty {
            width: 6%;
            text-align: center;
        }

        .col-price {
            width: 9%;
            text-align: right;
        }

        .col-client {
            width: 16%;
        }

        .col-phone {
            width: 12%;
        }

        .col-date {
            width: 10%;
            text-align: center;
        }

        .col-address {
            width: 18%;
        }

        tr {
            page-break-inside: avoid;
        }

        /* FOOTER */
        footer {
            margin-top: 45px;
            padding-top: 12px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 10px;
            color: #555;
        }

        /* PRINT STYLES */
        @media print {
            body {
                padding: 0;
            }
        }
    </style>
</head>

<body>

    <header>
        <h1>Realdeal Logistics – Riders Sheet</h1>

        <div class="header-content">
            <div class="company-info">
                <img src="data:image/png;base64,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"
                    alt="Realdeal Logistics Logo" style="max-width: 150px; height: auto; display: block;"></p>
                <p><strong>Realdeal Logistics</strong></p>
                <p>info@realdeallogistics.co.ke</p>
                <p>+254 1118 820 82</p>
                <p>Nairobi, Kenya</p>
            </div>

            <div class="meta-wrapper">
                <table class="meta">
                    <tr>
                        <th>Print Date</th>
                        <td>{{ $printDate }}</td>
                    </tr>
                    <tr>
                        <th>Rider / Agent</th>
                        <td>{{ $agent }}</td>
                    </tr>
                    <tr>
                        <th>Total Orders</th>
                        <td>{{ count($orders) }}</td>
                    </tr>
                </table>
            </div>
        </div>
    </header>

    <table class="inventory">
        <thead>
            <tr>
                <th class="col-order">Order No</th>
                <th class="col-product">Product</th>
                <th class="col-qty">Qty</th>
                <th class="col-price">Amount</th>
                <th class="col-client">Client Name</th>
                <th class="col-phone">Phone</th>
                <th class="col-date">Delivery Date</th>
                <th class="col-address">Address</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($orders as $order)
                <tr>
                    <td class="col-order">{{ $order->order_no }}</td>
                    <td class="col-product">{{ $order->product_name }}</td>
                    <td class="col-qty">{{ $order->quantity }}</td>
                    <td class="col-price">{{ number_format($order->amount, 2) }}</td>
                    <td class="col-client">{{ $order->client_name }}</td>
                    <td class="col-phone">{{ $order->phone }}</td>
                    <td class="col-date">
                        {{ $order->delivery_date ? \Carbon\Carbon::parse($order->delivery_date)->format('M d, Y') : 'Not set' }}
                    </td>
                    <td class="col-address">
                        {{ $order->city }} | {{ $order->address }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <footer>
        www.realdeallogistics.co.ke &nbsp;|&nbsp; Your trusted logistics partner
    </footer>

</body>

</html>
