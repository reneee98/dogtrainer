<?php

echo "Testing session access control...\n\n";

// Test 1: Owner without approved trainers should see no sessions
echo "Test 1: Owner (majitel@test.com) sessions access:\n";
$ownerToken = "Authorization: Bearer " . exec('curl -s -X POST http://localhost:8000/api/login -H "Content-Type: application/json" -d \'{"email":"majitel@test.com","password":"password123"}\' | php -r "echo json_decode(file_get_contents(\'php://stdin\'), true)[\'data\'][\'token\'];"');

if ($ownerToken && $ownerToken !== "Authorization: Bearer ") {
    $sessionsResponse = exec('curl -s -H "' . $ownerToken . '" http://localhost:8000/api/sessions');
    $sessions = json_decode($sessionsResponse, true);
    
    if ($sessions && $sessions['success']) {
        $sessionCount = count($sessions['data']['data'] ?? []);
        echo "Owner sees $sessionCount sessions\n";
        
        foreach ($sessions['data']['data'] ?? [] as $session) {
            echo "- Session: {$session['title']} by trainer {$session['trainer']['name']}\n";
        }
    } else {
        echo "Error fetching sessions: " . ($sessions['message'] ?? 'Unknown error') . "\n";
    }
} else {
    echo "Failed to authenticate owner\n";
}

echo "\n";

// Test 2: Trainer should see only their own sessions
echo "Test 2: Trainer (trener@test.com) sessions access:\n";
$trainerToken = "Authorization: Bearer " . exec('curl -s -X POST http://localhost:8000/api/login -H "Content-Type: application/json" -d \'{"email":"trener@test.com","password":"password123"}\' | php -r "echo json_decode(file_get_contents(\'php://stdin\'), true)[\'data\'][\'token\'];"');

if ($trainerToken && $trainerToken !== "Authorization: Bearer ") {
    $sessionsResponse = exec('curl -s -H "' . $trainerToken . '" http://localhost:8000/api/sessions');
    $sessions = json_decode($sessionsResponse, true);
    
    if ($sessions && $sessions['success']) {
        $sessionCount = count($sessions['data']['data'] ?? []);
        echo "Trainer sees $sessionCount sessions\n";
        
        foreach ($sessions['data']['data'] ?? [] as $session) {
            echo "- Session: {$session['title']} (own session)\n";
        }
    } else {
        echo "Error fetching sessions: " . ($sessions['message'] ?? 'Unknown error') . "\n";
    }
} else {
    echo "Failed to authenticate trainer\n";
}

echo "\nTest completed.\n";
?> 