<?php

namespace Tests\Unit\Models;

use App\Models\User;
use App\Models\Dog;
use App\Models\Session;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_user_has_fillable_attributes()
    {
        $fillable = [
            'name',
            'email',
            'password',
            'role',
            'phone',
            'bio',
            'avatar_url',
            'oauth_providers',
            'is_active',
            'email_notifications',
            'push_notifications',
        ];

        $user = new User();
        $this->assertEquals($fillable, $user->getFillable());
    }

    public function test_user_has_hidden_attributes()
    {
        $hidden = ['password', 'remember_token'];
        $user = new User();
        $this->assertEquals($hidden, $user->getHidden());
    }

    public function test_user_has_correct_casts()
    {
        $casts = [
            'id' => 'string',
            'email_verified_at' => 'datetime',
            'oauth_providers' => 'array',
            'is_active' => 'boolean',
            'email_notifications' => 'boolean',
            'push_notifications' => 'boolean',
            'password' => 'hashed',
        ];

        $user = new User();
        $actualCasts = $user->getCasts();

        foreach ($casts as $key => $cast) {
            $this->assertEquals($cast, $actualCasts[$key]);
        }
    }

    public function test_is_owner_returns_true_for_owner_role()
    {
        $user = User::factory()->make(['role' => 'owner']);
        $this->assertTrue($user->isOwner());
    }

    public function test_is_owner_returns_false_for_trainer_role()
    {
        $user = User::factory()->make(['role' => 'trainer']);
        $this->assertFalse($user->isOwner());
    }

    public function test_is_trainer_returns_true_for_trainer_role()
    {
        $user = User::factory()->make(['role' => 'trainer']);
        $this->assertTrue($user->isTrainer());
    }

    public function test_is_trainer_returns_false_for_owner_role()
    {
        $user = User::factory()->make(['role' => 'owner']);
        $this->assertFalse($user->isTrainer());
    }

    public function test_owners_scope_returns_only_owners()
    {
        User::factory()->create(['role' => 'owner']);
        User::factory()->create(['role' => 'trainer']);
        User::factory()->create(['role' => 'owner']);

        $owners = User::owners()->get();
        $this->assertCount(2, $owners);
        $this->assertTrue($owners->every(fn($user) => $user->role === 'owner'));
    }

    public function test_trainers_scope_returns_only_trainers()
    {
        User::factory()->create(['role' => 'owner']);
        User::factory()->create(['role' => 'trainer']);
        User::factory()->create(['role' => 'trainer']);

        $trainers = User::trainers()->get();
        $this->assertCount(2, $trainers);
        $this->assertTrue($trainers->every(fn($user) => $user->role === 'trainer'));
    }

    public function test_active_scope_returns_only_active_users()
    {
        User::factory()->create(['is_active' => true]);
        User::factory()->create(['is_active' => false]);
        User::factory()->create(['is_active' => true]);

        $activeUsers = User::active()->get();
        $this->assertCount(2, $activeUsers);
        $this->assertTrue($activeUsers->every(fn($user) => $user->is_active === true));
    }

    public function test_user_can_have_dogs()
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $dog = Dog::factory()->create(['owner_id' => $owner->id]);

        $this->assertInstanceOf('Illuminate\Database\Eloquent\Collection', $owner->dogs);
        $this->assertCount(1, $owner->dogs);
        $this->assertEquals($dog->id, $owner->dogs->first()->id);
    }

    public function test_user_can_have_sessions_as_trainer()
    {
        $trainer = User::factory()->create(['role' => 'trainer']);
        $session = Session::factory()->create(['trainer_id' => $trainer->id]);

        $this->assertInstanceOf('Illuminate\Database\Eloquent\Collection', $trainer->sessions);
        $this->assertCount(1, $trainer->sessions);
        $this->assertEquals($session->id, $trainer->sessions->first()->id);
    }

    public function test_user_can_have_trainer_bookings()
    {
        $trainer = User::factory()->create(['role' => 'trainer']);
        $booking = Booking::factory()->create(['trainer_id' => $trainer->id]);

        $this->assertInstanceOf('Illuminate\Database\Eloquent\Collection', $trainer->trainerBookings);
        $this->assertCount(1, $trainer->trainerBookings);
        $this->assertEquals($booking->id, $trainer->trainerBookings->first()->id);
    }

    public function test_user_password_is_hashed()
    {
        $user = User::factory()->create(['password' => 'plaintext']);
        
        $this->assertNotEquals('plaintext', $user->password);
        $this->assertTrue(\Hash::check('plaintext', $user->password));
    }

    public function test_oauth_providers_is_cast_to_array()
    {
        $providers = ['google', 'facebook'];
        $user = User::factory()->create(['oauth_providers' => $providers]);
        
        $this->assertIsArray($user->oauth_providers);
        $this->assertEquals($providers, $user->oauth_providers);
    }

    public function test_boolean_attributes_are_cast_correctly()
    {
        $user = User::factory()->create([
            'is_active' => 1,
            'email_notifications' => 1,
            'push_notifications' => 0,
        ]);

        $this->assertIsBool($user->is_active);
        $this->assertIsBool($user->email_notifications);
        $this->assertIsBool($user->push_notifications);
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->email_notifications);
        $this->assertFalse($user->push_notifications);
    }
} 