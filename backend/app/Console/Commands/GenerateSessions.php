<?php

namespace App\Console\Commands;

use App\Models\Session;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:generate 
                            {--days=30 : Number of days to generate sessions for}
                            {--trainer= : Specific trainer ID to generate sessions for}
                            {--force : Force generation even if sessions already exist}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate training sessions for trainers based on their availability';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🐕 Starting session generation...');
        
        $days = $this->option('days');
        $trainerId = $this->option('trainer');
        $force = $this->option('force');
        
        $startDate = Carbon::now()->startOfDay();
        $endDate = Carbon::now()->addDays($days)->endOfDay();
        
        $this->info("Generating sessions from {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");
        
        // Get trainers
        $trainers = $trainerId 
            ? User::where('role', 'trainer')->where('id', $trainerId)->get()
            : User::where('role', 'trainer')->get();
            
        if ($trainers->isEmpty()) {
            $this->error('No trainers found.');
            return 1;
        }
        
        $totalGenerated = 0;
        
        foreach ($trainers as $trainer) {
            $this->info("📋 Processing trainer: {$trainer->name}");
            
            $generated = $this->generateSessionsForTrainer($trainer, $startDate, $endDate, $force);
            $totalGenerated += $generated;
            
            $this->line("   ✅ Generated {$generated} sessions for {$trainer->name}");
        }
        
        $this->info("🎉 Session generation completed! Total sessions generated: {$totalGenerated}");
        
        // Log the operation
        Log::info('Sessions generated via command', [
            'total_sessions' => $totalGenerated,
            'trainers_count' => $trainers->count(),
            'date_range' => "{$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}",
            'generated_by' => 'artisan:sessions:generate'
        ]);
        
        return 0;
    }
    
    /**
     * Generate sessions for a specific trainer
     */
    private function generateSessionsForTrainer(User $trainer, Carbon $startDate, Carbon $endDate, bool $force): int
    {
        $generated = 0;
        
        // Define default session templates for trainers
        $sessionTemplates = [
            // Individual training sessions
            [
                'type' => 'individual',
                'name' => 'Individuálny tréning - Základy',
                'description' => 'Individuálny tréning zameraný na základné povely a poslušnosť.',
                'duration' => 60, // minutes
                'capacity' => 1,
                'price' => 35.00,
                'times' => ['09:00', '10:30', '14:00', '15:30'], // Available time slots
                'days' => [1, 2, 3, 4, 5], // Monday to Friday
            ],
            [
                'type' => 'individual',
                'name' => 'Individuálny tréning - Pokročilý',
                'description' => 'Pokročilý individuálny tréning pre skúsených psov.',
                'duration' => 60,
                'capacity' => 1,
                'price' => 45.00,
                'times' => ['11:00', '16:00'],
                'days' => [1, 2, 3, 4, 5],
            ],
            // Group training sessions
            [
                'type' => 'group',
                'name' => 'Skupinový tréning - Šteniata',
                'description' => 'Skupinový tréning pre šteniata do 6 mesiacov.',
                'duration' => 45,
                'capacity' => 6,
                'price' => 20.00,
                'times' => ['17:00'],
                'days' => [2, 4], // Tuesday, Thursday
            ],
            [
                'type' => 'group',
                'name' => 'Skupinový tréning - Dospelé psy',
                'description' => 'Skupinový tréning pre dospelé psy.',
                'duration' => 60,
                'capacity' => 8,
                'price' => 25.00,
                'times' => ['18:30'],
                'days' => [1, 3, 5], // Monday, Wednesday, Friday
            ],
            // Weekend special sessions
            [
                'type' => 'group',
                'name' => 'Víkendový workshop - Agility',
                'description' => 'Víkendový workshop zameraný na agility tréning.',
                'duration' => 90,
                'capacity' => 10,
                'price' => 30.00,
                'times' => ['10:00', '14:00'],
                'days' => [6], // Saturday
            ],
        ];
        
        $currentDate = $startDate->copy();
        
        while ($currentDate->lte($endDate)) {
            foreach ($sessionTemplates as $template) {
                // Check if this day is in the template's schedule
                if (!in_array($currentDate->dayOfWeek, $template['days'])) {
                    continue;
                }
                
                foreach ($template['times'] as $time) {
                    $sessionDateTime = $currentDate->copy()->setTimeFromTimeString($time);
                    
                    // Skip past dates
                    if ($sessionDateTime->isPast()) {
                        continue;
                    }
                    
                    // Check if session already exists (unless forced)
                    if (!$force) {
                        $existingSession = Session::where('trainer_id', $trainer->id)
                            ->where('session_date', $sessionDateTime)
                            ->where('name', $template['name'])
                            ->first();
                            
                        if ($existingSession) {
                            continue;
                        }
                    }
                    
                    // Create the session
                    Session::create([
                        'trainer_id' => $trainer->id,
                        'name' => $template['name'],
                        'description' => $template['description'],
                        'type' => $template['type'],
                        'session_date' => $sessionDateTime,
                        'duration' => $template['duration'],
                        'capacity' => $template['capacity'],
                        'price' => $template['price'],
                        'status' => 'available',
                        'location' => 'Tréningové centrum', // Default location
                        'requirements' => $this->getRequirementsForType($template['type']),
                        'metadata' => json_encode([
                            'auto_generated' => true,
                            'generated_at' => Carbon::now()->toISOString(),
                            'template' => $template['name'],
                        ]),
                    ]);
                    
                    $generated++;
                }
            }
            
            $currentDate->addDay();
        }
        
        return $generated;
    }
    
    /**
     * Get requirements based on session type
     */
    private function getRequirementsForType(string $type): ?string
    {
        return match($type) {
            'individual' => 'Pes musí byť očkovaný a mať platný zdravotný preukaz.',
            'group' => 'Pes musí byť očkovaný, socializovaný s inými psami a mať platný zdravotný preukaz.',
            default => 'Pes musí byť očkovaný a mať platný zdravotný preukaz.',
        };
    }
} 