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
        Schema::create('dogs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('owner_id');
            $table->string('name');
            $table->string('breed');
            $table->integer('age');
            $table->enum('size', ['small', 'medium', 'large'])->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->decimal('weight', 5, 2)->nullable(); // in kg
            $table->string('photo_url')->nullable();
            $table->text('medical_notes')->nullable();
            $table->text('behavioral_notes')->nullable();
            $table->json('vaccinations')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('owner_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['owner_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dogs');
    }
}; 