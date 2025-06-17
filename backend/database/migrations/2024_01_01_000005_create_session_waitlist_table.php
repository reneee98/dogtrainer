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
        Schema::create('session_waitlist', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('session_id');
            $table->uuid('dog_id');
            $table->text('notes')->nullable();
            $table->timestamp('joined_waitlist_at');
            $table->boolean('notified')->default(false);
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->foreign('session_id')->references('id')->on('sessions')->onDelete('cascade');
            $table->foreign('dog_id')->references('id')->on('dogs')->onDelete('cascade');
            
            // Ensure a dog can only be on waitlist once per session
            $table->unique(['session_id', 'dog_id']);
            
            $table->index(['session_id']);
            $table->index(['dog_id']);
            $table->index(['joined_waitlist_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_waitlist');
    }
}; 