<?php

namespace App\Console\Commands;

use App\Models\DaycareSchedule;
use App\Models\Session;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateDaycareSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'daycare:generate-sessions 
                           {--days=7 : Number of days ahead to generate sessions for}
                           {--schedule= : Specific schedule ID to generate sessions for}
                           {--force : Force generation even if sessions already exist}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate daycare sessions from active schedules';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting daycare session generation...');

        $days = (int) $this->option('days');
        $scheduleId = $this->option('schedule');
        $force = $this->option('force');

        $startDate = Carbon::today();
        $endDate = Carbon::today()->addDays($days);

        $this->info("Generating sessions from {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");

        // Get schedules to process
        $query = DaycareSchedule::active()->with('trainer');
        
        if ($scheduleId) {
            $query->where('id', $scheduleId);
        }

        $schedules = $query->get();

        if ($schedules->isEmpty()) {
            $this->warn('No active daycare schedules found.');
            return self::FAILURE;
        }

        $this->info("Found {$schedules->count()} active schedule(s) to process.");

        $totalGenerated = 0;
        $totalSkipped = 0;

        foreach ($schedules as $schedule) {
            $this->line("Processing schedule: {$schedule->title} (Trainer: {$schedule->trainer->name})");

            // Generate session data for this schedule
            $sessionData = $schedule->generateSessionsForDateRange($startDate, $endDate);

            if (empty($sessionData)) {
                $this->line("  No sessions to generate for this date range.");
                continue;
            }

            $generated = 0;
            $skipped = 0;

            foreach ($sessionData as $data) {
                // Check if session already exists
                $existingSession = Session::where('trainer_id', $data['trainer_id'])
                                         ->where('schedule_id', $data['schedule_id'])
                                         ->whereDate('start_time', $data['start_time']->toDateString())
                                         ->whereTime('start_time', $data['start_time']->toTimeString())
                                         ->first();

                if ($existingSession && !$force) {
                    $skipped++;
                    continue;
                }

                if ($existingSession && $force) {
                    $this->line("  Deleting existing session for {$data['start_time']->format('Y-m-d H:i')}");
                    $existingSession->delete();
                }

                // Create new session
                $data['id'] = Str::uuid();
                Session::create($data);
                $generated++;

                $this->line("  Generated session for {$data['start_time']->format('Y-m-d H:i')}");
            }

            $this->info("  Generated: {$generated}, Skipped: {$skipped}");
            $totalGenerated += $generated;
            $totalSkipped += $skipped;
        }

        $this->info("Session generation completed!");
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Generated', $totalGenerated],
                ['Total Skipped', $totalSkipped],
                ['Schedules Processed', $schedules->count()],
            ]
        );

        if ($totalGenerated > 0) {
            $this->info("Successfully generated {$totalGenerated} new sessions.");
        }

        if ($totalSkipped > 0) {
            $this->warn("{$totalSkipped} sessions were skipped (already exist). Use --force to overwrite.");
        }

        return self::SUCCESS;
    }
} 