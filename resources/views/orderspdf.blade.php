<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Waybill Template</title>
    <style>
        /* reset */
        * {
            border: 0;
            box-sizing: content-box;
            color: inherit;
            font-family: inherit;
            font-size: inherit;
            font-style: inherit;
            font-weight: inherit;
            line-height: inherit;
            list-style: none;
            margin: 0;
            padding: 0;
            text-decoration: none;
            vertical-align: top;
        }

        /* content editable */
        *[contenteditable] {
            border-radius: 0.25em;
            min-width: 1em;
            outline: 0;
        }

        *[contenteditable] {
            cursor: pointer;
        }

        *[contenteditable]:hover, 
        *[contenteditable]:focus, 
        td:hover *[contenteditable], 
        td:focus *[contenteditable], 
        img.hover {
            background: #DEF;
            box-shadow: 0 0 1em 0.5em #DEF;
        }

        span[contenteditable] {
            display: inline-block;
        }

        /* heading */
        h1 {
            font: bold 100% sans-serif;
            letter-spacing: 0.5em;
            text-align: center;
            text-transform: uppercase;
        }

        /* table */
        table {
            font-size: 75%;
            table-layout: fixed;
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
        }

        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }

        th {
            background: #EEE;
        }

        td {
            background: #FFF;
        }

        th, td {
            width: 14.28%;
        }

        td:first-child, th:first-child {
            width: 7.14%;
        }

        td:last-child, th:last-child {
            width: 21.42%;
        }

        /* page */
        html {
            font: 16px/1 'Open Sans', sans-serif;
            overflow: auto;
            padding: 0.5in;
            background: #999;
            cursor: default;
        }

        body {
            box-sizing: border-box;
            height: 11in;
            margin: 0 auto;
            overflow: hidden;
            padding: 0.5in;
            background: #FFF;
            border-radius: 1px;
            box-shadow: 0 0 1in -0.25in rgba(0, 0, 0, 0.5);
        }

   
        header:after {
            clear: both;
            content: "";
            display: table;
        }

        header h1 {
            background: black;
            border-radius: 0.25em;
            color: whitesmoke;
            margin: 0 0 1em;
            padding: 0.5em 0;
        }

        header address {
            float: left;
            font-size: 75%;
            font-style: normal;
            line-height: 1.25;
            margin: 0 1em 1em 0;
        }

        header address p {
            margin: 0 0 0.25em;
        }

        header span, header img {
            display: block;
            float: right;
        }

        header span {
            margin: 0 0 1em 1em;
            max-height: 25%;
            max-width: 60%;
            position: relative;
        }

        header img {
            max-height: 100%;
            max-width: 100%;
        }

        header input {
            cursor: pointer;
            height: 100%;
            left: 0;
            opacity: 0;
            position: absolute;
            top: 0;
            width: 100%;
        }

        /* article */
        article, article address, table.meta, table.inventory {
            margin: 0 0 3em;
        }

        article:after {
            clear: both;
            content: "";
            display: table;
        }

        article h1 {
            clip: rect(0 0 0 0);
            position: absolute;
        }

        article address {
            float: left;
            font-size: 125%;
            font-weight: none;
        }

        /* table meta & balance */
        table.meta, table.balance {
            float: right;
            width: 36%;
        }

        table.meta:after, table.balance:after {
            clear: both;
            content: "";
            display: table;
        }

        table.meta th {
            width: 40%;
        }

        table.meta td {
            width: 60%;
        }

        /* table items */
        table.inventory {
            clear: both;
            width: 100%;
        }

        table.inventory th {
            font-weight: bold;
            text-align: center;
        }

        table.inventory td:nth-child(1) {
            width: 26%;
        }

        table.inventory td:nth-child(2) {
            width: 38%;
        }

        table.inventory td:nth-child(3), 
        table.inventory td:nth-child(4), 
        table.inventory td:nth-child(5) {
            text-align: right;
            width: 12%;
        }

        /* table balance */
        table.balance th, table.balance td {
            width: 50%;
        }

        table.balance td {
            text-align: right;
        }

        /* footer */
        footer h1 {
            border: none;
            border-width: 0 0 1px;
            margin: 0 0 1em;
            border-color: #999;
            border-bottom-style: solid;
        }

        @page {
            margin: 0;
        }
    </style>
</head>
<body>
    <header>
        <h1>Realdeal Logistics<br>Riders Sheet</h1>
        <address></address>
    </header>
    <article>
        <table class="meta">
            <tr>
                <th><span>Delivery Date</span></th>
                <td><span>{{ $date }}</span></td>
            </tr>
            <tr>
                <th><span>Rider/Agent</span></th>
                <td><span>{{ $agent }}</span></td>
            </tr>
        </table>
        <table class="inventory">
            <thead>
                <tr>
                    <th><span>Order No</span></th>
                    <th><span>Product</span></th>
                    <th><span>Qty</span></th>
                    <th><span>Price</span></th>
                    <th><span>Client Name</span></th>
                    <th><span>Phone No</span></th>
                    <th><span>Address</span></th>
                </tr>
            </thead>
            <tbody>
                @foreach ($orders as $order)
                <tr>
                    <td>{{ $order->order_no }}</td>
                    <td>{{ $order->product_name }}</td>
                    <td>{{ $order->quantity }}</td>
                    <td>{{ $order->amount }}</td>
                    <td>{{ $order->client_name }}</td>
                    <td>{{ $order->phone }}</td>
                    <td>{{ $order->city }} | {{ $order->address }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </article>
</body>
</html>
