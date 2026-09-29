<?php
// Configuración de CORS para permitir peticiones desde Ionic/Angular (localhost:8100)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Credenciales de la base de datos XAMPP
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

// Recibir los datos de Angular
$data = json_decode(file_get_contents("php://input"));

if(isset($data->username) && isset($data->password)) {
    // Hashear la contraseña antes de guardarla (Práctica esencial de seguridad)
    $passHash = password_hash($data->password, PASSWORD_BCRYPT);

    $sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    $stmt = $pdo->prepare($sql);

    try {
        $stmt->execute([
            $data->username, 
            $passHash
        ]);
        echo json_encode(["status" => "success", "message" => "Cuenta creada exitosamente."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "El piloto ya existe o hubo un error."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Datos incompletos."]);
}
?>