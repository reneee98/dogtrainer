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
        Schema::create('trainer_clients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('trainer_id');
            $table->uuid('client_id');
            $table->enum('status', ['pending', 'approved', 'rejected', 'blocked'])->default('pending');
            $table->text('request_message')->nullable(); // Message from client when requesting
            $table->text('trainer_notes')->nullable(); // Trainer's notes when approving/rejecting
            $table->timestamp('requested_at');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('trainer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('client_id')->references('id')->on('users')->onDelete('cascade');

            // Unique constraint to prevent duplicate relationships
            $table->unique(['trainer_id', 'client_id']);

            // Index for better performance
            $table->index(['trainer_id', 'status']);
            $table->index(['client_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trainer_clients');
    }
}; 