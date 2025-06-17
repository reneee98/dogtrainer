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
        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('dog_id');
            $table->uuid('trainer_id');
            $table->uuid('booking_id')->nullable(); // for individual bookings
            $table->uuid('session_id')->nullable(); // for group sessions
            $table->integer('rating')->unsigned(); // 1-5 stars
            $table->text('comment')->nullable();
            $table->json('feedback_categories')->nullable(); // JSON with different rating categories
            $table->boolean('is_public')->default(true);
            $table->uuid('reply_by')->nullable(); // trainer reply
            $table->text('reply')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->foreign('dog_id')->references('id')->on('dogs')->onDelete('cascade');
            $table->foreign('trainer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
            $table->foreign('session_id')->references('id')->on('sessions')->onDelete('cascade');
            $table->foreign('reply_by')->references('id')->on('users')->onDelete('set null');
            
            $table->index(['trainer_id']);
            $table->index(['rating']);
            $table->index(['is_public']);
            
            // Ensure one review per booking/session per dog
            $table->unique(['dog_id', 'booking_id']);
            $table->unique(['dog_id', 'session_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
}; 