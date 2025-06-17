<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('trainer_id');
            $table->uuid('schedule_id')->nullable(); // for daycare recurring sessions
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location');
            $table->datetime('start_time');
            $table->datetime('end_time');
            $table->integer('capacity');
            $table->boolean('waitlist_enabled')->default(false);
            $table->enum('session_type', ['individual', 'group', 'daycare'])->default('individual');
            $table->decimal('price', 8, 2)->nullable();
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->foreign('trainer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('schedule_id')->references('id')->on('daycare_schedules')->onDelete('set null');
            
            $table->index(['trainer_id']);
            $table->index(['start_time']);
            $table->index(['session_type']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
    }
}; 