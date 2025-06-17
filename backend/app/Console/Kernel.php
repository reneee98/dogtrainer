<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Generate sessions for the next 30 days, daily at 6 AM
        $schedule->command('sessions:generate --days=30')
                 ->dailyAt('06:00')
                 ->withoutOverlapping()
                 ->runInBackground()
                 ->emailOutputOnFailure('admin@dogbooking.sk');

        // Clean up expired sessions weekly
        $schedule->command('sessions:cleanup')
                 ->weekly()
                 ->sundays()
                 ->at('02:00')
                 ->withoutOverlapping();

        // Send reminder notifications for upcoming bookings
        $schedule->command('bookings:send-reminders')
                 ->hourly()
                 ->between('08:00', '20:00')
                 ->withoutOverlapping();

        // Process failed queue jobs
        $schedule->command('queue:retry all')
                 ->everyFifteenMinutes()
                 ->withoutOverlapping();

        // Clear expired password reset tokens
        $schedule->command('auth:clear-resets')
                 ->everyFifteenMinutes();

        // Update session statistics
        $schedule->command('sessions:update-stats')
                 ->hourly()
                 ->withoutOverlapping();

        // Clean up old notifications
        $schedule->command('notifications:clean')
                 ->daily()
                 ->at('03:00');

        // Backup database (handled by Docker backup service, but keep as fallback)
        $schedule->command('backup:database')
                 ->daily()
                 ->at('02:30')
                 ->onFailure(function () {
                     // Notify administrators of backup failure
                 });

        // Send daily statistics report to trainers
        $schedule->command('reports:daily-stats')
                 ->daily()
                 ->at('07:00')
                 ->weekdays();

        // Monthly revenue reports
        $schedule->command('reports:monthly-revenue')
                 ->monthly()
                 ->at('09:00');

        // Clear application cache
        $schedule->command('cache:clear')
                 ->weekly()
                 ->sundays()
                 ->at('04:00');

        // Optimize database tables
        $schedule->command('db:optimize')
                 ->weekly()
                 ->sundays()
                 ->at('04:30');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
} 