<?php

namespace App\Console\Commands;

use App\Models\CallLog;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class VoiceSmokeCheck extends Command
{
    protected $signature = 'voice:smoke-check
        {--hours=2 : Time window in hours}
        {--require=answered,busy,noanswer,rejected,inbound : Comma-separated scenarios that must be observed}';

    protected $description = 'Validate recent voice outcomes after manual end-to-end smoke testing.';

    public function handle(): int
    {
        if (! Schema::hasTable('call_logs')) {
            $this->error('call_logs table not found. Run migrations before voice smoke check.');
            return self::FAILURE;
        }

        $hours = max(1, (int) $this->option('hours'));
        $since = Carbon::now()->subHours($hours);
        $required = collect(explode(',', (string) $this->option('require')))
            ->map(fn (string $item) => strtolower(trim($item)))
            ->filter()
            ->values();

        $recent = CallLog::query()
            ->where('created_at', '>=', $since)
            ->latest('created_at')
            ->limit(300)
            ->get();

        $this->line("Window: last {$hours} hour(s) since {$since->toDateTimeString()}");
        $this->line('Recent calls analyzed: ' . $recent->count());

        $observed = [
            'answered' => $recent->contains(function (CallLog $call) {
                return $call->direction === 'outbound' &&
                    $call->answered_at !== null &&
                    in_array($call->status, ['connected', 'completed'], true);
            }),
            'busy' => $recent->contains(function (CallLog $call) {
                return ($call->metadata['provider_end_state'] ?? null) === 'busy';
            }),
            'noanswer' => $recent->contains(function (CallLog $call) {
                $state = (string) ($call->metadata['provider_end_state'] ?? '');
                return in_array($state, ['notanswered', 'noanswer', 'unavailable'], true);
            }),
            'rejected' => $recent->contains(function (CallLog $call) {
                return ($call->metadata['provider_end_state'] ?? null) === 'rejected';
            }),
            'inbound' => $recent->contains(function (CallLog $call) {
                return $call->direction === 'inbound';
            }),
        ];

        $this->newLine();
        $this->info('Scenario coverage:');
        foreach ($observed as $name => $isSeen) {
            $label = str_pad($name, 9, ' ', STR_PAD_RIGHT);
            $this->line(" - {$label}: " . ($isSeen ? 'OK' : 'MISSING'));
        }

        $this->newLine();
        $this->info('Recent provider end states:');
        $stateCounts = $recent
            ->map(fn (CallLog $call) => strtolower((string) ($call->metadata['provider_end_state'] ?? 'none')))
            ->countBy();

        foreach ($stateCounts as $state => $count) {
            $this->line(" - {$state}: {$count}");
        }

        $missing = $required->filter(fn (string $scenario) => !($observed[$scenario] ?? false))->values();
        if ($missing->isNotEmpty()) {
            $this->newLine();
            $this->error('Smoke check incomplete. Missing scenarios: ' . $missing->implode(', '));
            $this->line('Run manual tests for missing scenarios, then rerun this command.');
            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Voice smoke check passed for required scenarios.');
        return self::SUCCESS;
    }
}
