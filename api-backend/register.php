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

if(isset($data->email) && isset($data->pass)) {
    // Hashear la contraseña antes de guardarla (Práctica esencial de seguridad)
    $passHash = password_hash($data->pass, PASSWORD_BCRYPT);

    $sql = "INSERT INTO users (email, password, twitter, facebook, gplus, fname, lname, phone, address) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);

    try {
        $stmt->execute([
            $data->email, 
            $passHash, 
            $data->twitter ?? '', 
            $data->facebook ?? '',
            $data->gplus ?? '', 
            $data->fname ?? '', 
            $data->lname ?? '',
            $data->phone ?? '', 
            $data->address ?? ''
        ]);
        echo json_encode(["status" => "success", "message" => "Cuenta creada exitosamente."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "El correo ya existe o hubo un error."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Datos incompletos."]);
}
?>