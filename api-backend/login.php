<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { exit(0); }

$host = getenv('MYSQLHOST') ?: "localhost";
$user = getenv('MYSQLUSER') ?: "root";
$password = getenv('MYSQLPASSWORD') ?: "";
$dbname = getenv('MYSQLDATABASE') ?: "app_db";
$port = getenv('MYSQLPORT') ?: "3306";

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Error de conexión a la BD."]);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

if(isset($data->email) && isset($data->pass)) {
    // Buscar al usuario por correo
    $sql = "SELECT id, email, password, fname FROM users WHERE email = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data->email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verificar si el usuario existe y la contraseña coincide
    if($user && password_verify($data->pass, $user['password'])) {
        unset($user['password']); // No enviar la contraseña al frontend por seguridad
        echo json_encode([
            "status" => "success", 
            "message" => "Login exitoso",
            "user" => $user
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Correo o contraseña incorrectos."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Datos incompletos."]);
}
?>