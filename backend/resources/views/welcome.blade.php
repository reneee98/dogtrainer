<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dog Booking System API</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 3em; margin-bottom: 20px; }
        p { font-size: 1.2em; margin: 15px 0; }
        .status { color: #4ade80; font-weight: bold; }
        .api-info { margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐕 Dog Booking System</h1>
        <p class="status">✅ Backend API je aktívny!</p>
        <p>Laravel {{ app()->version() }}</p>
        <div class="api-info">
            <p><strong>API Endpoints:</strong></p>
            <p>• GET /api/health - Kontrola stavu</p>
            <p>• POST /api/auth/login - Prihlásenie</p>
            <p>• POST /api/auth/register - Registrácia</p>
            <p>• GET /api/dogs - Zoznam psov</p>
            <p>• GET /api/sessions - Tréningové session</p>
        </div>
        <p style="margin-top: 30px; opacity: 0.8;">
            Frontend: <a href="http://localhost:3000" style="color: #fbbf24;">http://localhost:3000</a>
        </p>
    </div>
</body>
</html> 