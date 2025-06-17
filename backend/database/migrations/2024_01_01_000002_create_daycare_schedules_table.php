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
        Schema::create('daycare_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('trainer_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location');
            $table->integer('capacity');
            $table->boolean('waitlist_enabled')->default(false);
            $table->json('days_of_week'); // [1, 2, 3] for Mon, Tue, Wed
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('price', 8, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->timestamps();

            $table->foreign('trainer_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['trainer_id']);
            $table->index(['is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daycare_schedules');
    }
}; 