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
        Schema::create('bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('dog_id');
            $table->uuid('trainer_id');
            $table->enum('service_type', ['obedience', 'daycare', 'grooming', 'training']);
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled', 'completed'])->default('pending');
            $table->text('notes')->nullable();
            $table->text('special_requirements')->nullable();
            $table->decimal('price', 8, 2)->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->uuid('cancelled_by')->nullable();
            $table->timestamps();

            $table->foreign('dog_id')->references('id')->on('dogs')->onDelete('cascade');
            $table->foreign('trainer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('cancelled_by')->references('id')->on('users')->onDelete('set null');
            
            $table->index(['dog_id']);
            $table->index(['trainer_id']);
            $table->index(['booking_date']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
}; 