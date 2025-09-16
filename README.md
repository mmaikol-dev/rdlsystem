
# Real Deal Logistics System (RDLS)

A logistics and order management system built with **Laravel** to streamline product distribution, call center management, Google Sheets integration, AI-powered inventory management, and M-Pesa payments.

## 🚀 Features

- **Product & Inventory Management**
  - Create products, assign categories & merchants
  - Track quantities across distributors/agents
  - Prevent deductions when stock reaches zero
  - **AI-Powered Inventory Insights**:
    - Forecast demand using sales & stock data
    - Get restocking recommendations
    - Detect anomalies in stock movement
    - Generate quick reports via AI API

- **Order Management**
  - Fetch & sync orders from **Google Sheets**
  - Handle scheduled & rescheduled deliveries
  - Assign call center agents automatically
  - Track updates with progress storage tables

- **Call Center Module**
  - Assign orders to call center agents
  - Handle voice calls via Africa’s Talking API
  - Logs for incoming & outgoing calls

- **Payments Integration**
  - **M-Pesa STK Push** support
  - **M-Pesa Pull API** for transactions
  - Store and filter transactions by order, phone, and date

- **Automation**
  - Cron jobs for fetching orders & updates
  - Scheduled delivery notifications at 8:00 AM
  - SMS & WhatsApp customer communication

- **Dashboard & Reports**
  - Filters for orders (status, merchant, date, type, call center, etc.)
  - Analytics & charts for monitoring performance
  - AI-generated summaries for inventory & sales trends

## 🛠️ Tech Stack

- **Backend**: Laravel (PHP 8+)
- **Database**: MySQL
- **Frontend**: Inertia.js + React + TailwindCSS + ShadCN UI
- **AI API**: Google Gemini / OpenAI for inventory insights & reporting
- **APIs**: Google Sheets API, Africa’s Talking Voice/SMS, Safaricom M-Pesa API
- **Deployment**: cPanel + Cron Jobs

## ⚙️ Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/mmaikol-dev/rdlsystem.git
   cd rdlsystem
````

2. Install dependencies:

   ```bash
   composer install
   npm install && npm run build
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

   Update `.env` with:

   * Database credentials
   * Google Sheets API credentials
   * M-Pesa API keys
   * Africa’s Talking credentials
   * AI API Key (Google Gemini / OpenAI)

4. Run migrations:

   ```bash
   php artisan migrate
   ```

5. Start development server:

   ```bash
   php artisan serve
   ```

## 🖥️ Cron Jobs

Add this to cPanel cron:

```bash
* * * * * /usr/local/bin/php /home/realdea1/public_html/realdealsystem/artisan schedule:run >> /home/realdea1/public_html/realdealsystem/storage/logs/cron.log 2>&1
```

## 📊 Key Commands

* Update product quantities:

  ```bash
  php artisan products:update-quantities
  ```

* Fetch and store orders:

  ```bash
  php artisan orders:fetch
  ```

* Sync Google Sheets:

  ```bash
  php artisan orders:update-sheet
  ```

* AI Inventory Insights:

  ```bash
  php artisan ai:inventory-report
  ```

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.

## 📜 License

This project is licensed under the MIT License.

