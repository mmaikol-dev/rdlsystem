<?php

namespace App\Http\Controllers;

use App\Models\Ai;
use App\Models\SheetOrder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Illuminate\Http\Request;

class AiController extends Controller
{
    private $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    private $apiKey    = "AIzaSyDLUHrXjS0b_0YYllywlf7rvM4r3BIpgAk";

    public function index()
    {
        return Inertia::render('ai/index');
    }

    public function ask(Request $request)
    {
        $message = $request->input('message');

        if (!$message) {
            return response()->json(['reply' => 'No message provided.'], 400);
        }

        try {
            Log::info("AI ASK: User message", ['message' => $message]);

            // Prompt for SQL generation
            $prompt = "
You are a database assistant. You have access to ONE table called 'sheet_orders'.

Full schema (columns):
id, order_date, order_no, amount, client_name, address, phone, alt_no, country, city,
product_name, quantity, status, agent, delivery_date, instructions, cc_email,
merchant, order_type, sheet_id, sheet_name, created_at, updated_at, code, store_name, processed

CRITICAL RULES:
1. If the user asks about database information, respond with ONLY a valid SQL SELECT query.
2. ALWAYS start with SELECT (never SHOW, DISPLAY, or other words).
3. Do NOT add explanations, comments, or extra text.
4. Do NOT wrap SQL in quotes or markdown.
5. Do NOT include 'Output:' or other labels.
6. Use ONLY the 'sheet_orders' table and the listed columns.
7. End with a semicolon.
8. If not database-related, respond with exactly: NOQUERY.

Examples:
- 'show order ABC123' → SELECT * FROM sheet_orders WHERE order_no = 'ABC123';
- 'how many orders' → SELECT COUNT(*) FROM sheet_orders;
- 'pending orders' → SELECT COUNT(*) FROM sheet_orders WHERE status = 'pending';
- 'orders this week' → SELECT * FROM sheet_orders WHERE delivery_date BETWEEN CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY AND CURDATE() + INTERVAL (6 - WEEKDAY(CURDATE())) DAY;
- 'hello' → NOQUERY

User question: {$message}
";

            // Call Gemini for intent/SQL
            $intentCheck = Http::timeout(60)->post($this->geminiUrl . "?key=" . $this->apiKey, [
                "contents" => [
                    [
                        "parts" => [["text" => $prompt]]
                    ]
                ]
            ]);

            if (!$intentCheck->successful()) {
                Log::error("Gemini API error", [
                    'status' => $intentCheck->status(),
                    'body'   => $intentCheck->body(),
                ]);
                return response()->json(['reply' => 'AI service error.'], 500);
            }

            $intent = trim($intentCheck->json('candidates.0.content.parts.0.text') ?? 'NOQUERY');
            Log::info("AI ASK: Intent raw response", ['intent' => $intent]);

            $reply = "";

            if (stripos($intent, 'SELECT') !== false) {
                $sql = $this->cleanSQL($intent);
                Log::info("AI ASK: Cleaned SQL", ['sql' => $sql]);

                if (!$sql) {
                    return response()->json(['reply' => 'Could not generate a valid database query.'], 400);
                }

                $sql = $this->makeCaseInsensitive($sql);

                if (!preg_match('/^SELECT\s+/i', $sql)) {
                    return response()->json(['reply' => 'Only SELECT queries are allowed.'], 400);
                }

                try {
                    $results = DB::select($sql);
                    Log::info("AI ASK: SQL executed", ['sql' => $sql, 'results_count' => count($results)]);
                } catch (\Exception $e) {
                    Log::error("AI ASK: SQL failed", ['sql' => $sql, 'error' => $e->getMessage()]);
                    return response()->json(['reply' => 'Error running database query: Invalid syntax or column names.'], 500);
                }

                if (empty($results)) {
                    $reply = "No matching records found.";
                } else {
                    $reply = $this->summarizeResults($results, $message);
                }
            } else {
                $reply = $this->getGeneralResponse($message);
            }

            return response()->json(['reply' => $reply]);
        } catch (\Exception $e) {
            Log::error("AI ASK: Fatal error", ['error' => $e->getMessage()]);
            return response()->json(['reply' => 'Service temporarily unavailable. Please try again.'], 500);
        }
    }

    private function cleanSQL($rawResponse)
    {
        if (preg_match('/SELECT.*?;/is', $rawResponse, $matches)) {
            $sql = $matches[0];
        } else {
            return null;
        }

        $sql = preg_replace('/\s+/', ' ', $sql);
        $sql = trim($sql);
        $sql = rtrim($sql, ";") . ";";

        return $sql;
    }

    private function makeCaseInsensitive($sql)
    {
        $textColumns = [
            'order_no', 'client_name', 'product_name', 'address',
            'phone', 'alt_no', 'status', 'instructions', 'code', 'merchant'
        ];

        foreach ($textColumns as $col) {
            $sql = preg_replace(
                "/\b{$col}\s*=\s*'([^']*)'/i",
                "LOWER({$col}) = LOWER('$1')",
                $sql
            );

            $sql = preg_replace(
                "/\b{$col}\s+LIKE\s*'([^']*)'/i",
                "LOWER({$col}) LIKE LOWER('$1')",
                $sql
            );
        }

        return $sql;
    }

    private function summarizeResults($results, $originalQuestion)
    {
        try {
            if (count($results) === 1) {
                $row = (array) $results[0];
                if (count($row) === 1) {
                    $value = reset($row);
                    return "The result is {$value}.";
                }
            }

            $summaryPrompt = "
User asked: '{$originalQuestion}'.
Results: " . json_encode($results, JSON_PRETTY_PRINT) . "

Rules:
- Answer with a short, direct sentence.
- No explanations or extra commentary.
";

            $aiResponse = Http::timeout(60)->post($this->geminiUrl . "?key=" . $this->apiKey, [
                "contents" => [
                    [
                        "parts" => [["text" => $summaryPrompt]]
                    ]
                ]
            ]);

            if ($aiResponse->successful()) {
                return trim($aiResponse->json('candidates.0.content.parts.0.text') ?? "Found " . count($results) . " record(s).");
            }

            return "Found " . count($results) . " record(s). Summary unavailable.";
        } catch (\Exception $e) {
            Log::error("AI ASK: Summary error", ['error' => $e->getMessage()]);
            return "Found " . count($results) . " record(s). Summary unavailable.";
        }
    }

    private function getGeneralResponse($message)
    {
        try {
            $aiResponse = Http::timeout(60)->post($this->geminiUrl . "?key=" . $this->apiKey, [
                "contents" => [
                    [
                        "parts" => [["text" => $message]]
                    ]
                ]
            ]);

            if ($aiResponse->successful()) {
                return $aiResponse->json('candidates.0.content.parts.0.text') ?? "Hello! How can I help you today?";
            }

            return "Hello! How can I help you today?";
        } catch (\Exception $e) {
            Log::error("AI ASK: General response error", ['error' => $e->getMessage()]);
            return "Hello! How can I help you today?";
        }
    }
}
