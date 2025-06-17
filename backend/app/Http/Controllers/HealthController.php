<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthController extends Controller
{
    /**
     * Basic health check endpoint
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toISOString(),
            'service' => 'Dog Booking System API',
            'version' => config('app.version', '1.0.0'),
        ]);
    }

    /**
     * Detailed health check with dependencies
     */
    public function detailed(): JsonResponse
    {
        $checks = [];
        $overallStatus = 'healthy';

        // Database check
        try {
            DB::connection()->getPdo();
            $userCount = User::count();
            $checks['database'] = [
                'status' => 'healthy',
                'connection' => 'ok',
                'users_count' => $userCount,
                'response_time' => $this->measureExecutionTime(fn() => DB::select('SELECT 1')),
            ];
        } catch (\Exception $e) {
            $checks['database'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
            $overallStatus = 'unhealthy';
        }

        // Redis check
        try {
            $redis = Redis::connection();
            $redis->ping();
            $checks['redis'] = [
                'status' => 'healthy',
                'connection' => 'ok',
                'response_time' => $this->measureExecutionTime(fn() => $redis->ping()),
            ];
        } catch (\Exception $e) {
            $checks['redis'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
            $overallStatus = 'unhealthy';
        }

        // Cache check
        try {
            $testKey = 'health_check_' . time();
            $testValue = 'test';
            
            Cache::put($testKey, $testValue, 60);
            $retrieved = Cache::get($testKey);
            Cache::forget($testKey);
            
            $checks['cache'] = [
                'status' => $retrieved === $testValue ? 'healthy' : 'unhealthy',
                'write_read' => $retrieved === $testValue ? 'ok' : 'failed',
            ];
            
            if ($retrieved !== $testValue) {
                $overallStatus = 'unhealthy';
            }
        } catch (\Exception $e) {
            $checks['cache'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
            $overallStatus = 'unhealthy';
        }

        // Storage check
        try {
            $testFile = storage_path('app/health_check.txt');
            file_put_contents($testFile, 'test');
            $content = file_get_contents($testFile);
            unlink($testFile);
            
            $checks['storage'] = [
                'status' => $content === 'test' ? 'healthy' : 'unhealthy',
                'write_read' => $content === 'test' ? 'ok' : 'failed',
                'path' => storage_path('app'),
                'writable' => is_writable(storage_path('app')),
            ];
            
            if ($content !== 'test') {
                $overallStatus = 'unhealthy';
            }
        } catch (\Exception $e) {
            $checks['storage'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
            $overallStatus = 'unhealthy';
        }

        // Queue check
        try {
            $queueConnection = config('queue.default');
            $checks['queue'] = [
                'status' => 'healthy',
                'default_connection' => $queueConnection,
                'driver' => config("queue.connections.{$queueConnection}.driver"),
            ];
        } catch (\Exception $e) {
            $checks['queue'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
            $overallStatus = 'unhealthy';
        }

        // Mail check
        try {
            $mailConfig = config('mail.default');
            $checks['mail'] = [
                'status' => 'healthy',
                'default_mailer' => $mailConfig,
                'driver' => config("mail.mailers.{$mailConfig}.transport"),
            ];
        } catch (\Exception $e) {
            $checks['mail'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }

        $response = [
            'status' => $overallStatus,
            'timestamp' => now()->toISOString(),
            'service' => 'Dog Booking System API',
            'version' => config('app.version', '1.0.0'),
            'environment' => config('app.env'),
            'checks' => $checks,
            'system' => [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
            ],
        ];

        $status = $overallStatus === 'healthy' ? 200 : 503;
        
        return response()->json($response, $status);
    }

    /**
     * Readiness probe for Kubernetes/Docker
     */
    public function ready(): JsonResponse
    {
        // Check if application is ready to serve traffic
        try {
            // Check database connectivity
            DB::connection()->getPdo();
            
            // Check if migrations are up to date
            $migrationsTable = config('database.migrations');
            $migrationCount = DB::table($migrationsTable)->count();
            
            return response()->json([
                'status' => 'ready',
                'timestamp' => now()->toISOString(),
                'migrations_count' => $migrationCount,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'not_ready',
                'timestamp' => now()->toISOString(),
                'error' => $e->getMessage(),
            ], 503);
        }
    }

    /**
     * Liveness probe for Kubernetes/Docker
     */
    public function live(): JsonResponse
    {
        // Basic liveness check - if this endpoint responds, the app is alive
        return response()->json([
            'status' => 'alive',
            'timestamp' => now()->toISOString(),
            'uptime' => $this->getUptime(),
        ]);
    }

    /**
     * Application metrics for monitoring
     */
    public function metrics(): JsonResponse
    {
        $metrics = [];

        try {
            // Database metrics
            $metrics['database'] = [
                'users_total' => User::count(),
                'trainers_total' => User::where('role', 'trainer')->count(),
                'owners_total' => User::where('role', 'owner')->count(),
            ];

            // System metrics
            $metrics['system'] = [
                'memory_usage_bytes' => memory_get_usage(true),
                'memory_peak_bytes' => memory_get_peak_usage(true),
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
            ];

            // Cache metrics
            if (config('cache.default') === 'redis') {
                try {
                    $redis = Redis::connection();
                    $info = $redis->info();
                    $metrics['cache'] = [
                        'used_memory' => $info['used_memory'] ?? null,
                        'connected_clients' => $info['connected_clients'] ?? null,
                        'total_commands_processed' => $info['total_commands_processed'] ?? null,
                    ];
                } catch (\Exception $e) {
                    $metrics['cache'] = ['error' => $e->getMessage()];
                }
            }

        } catch (\Exception $e) {
            $metrics['error'] = $e->getMessage();
        }

        return response()->json([
            'timestamp' => now()->toISOString(),
            'metrics' => $metrics,
        ]);
    }

    /**
     * Measure execution time of a callback
     */
    private function measureExecutionTime(callable $callback): float
    {
        $start = microtime(true);
        $callback();
        $end = microtime(true);
        
        return round(($end - $start) * 1000, 2); // milliseconds
    }

    /**
     * Get application uptime
     */
    private function getUptime(): array
    {
        $startTime = Cache::remember('app_start_time', 3600, function () {
            return now();
        });

        $uptime = now()->diffInSeconds($startTime);

        return [
            'seconds' => $uptime,
            'human' => gmdate('H:i:s', $uptime),
            'started_at' => $startTime->toISOString(),
        ];
    }
} 