<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Cấu hình Database
$host = 'localhost';
$db_name = 'zezprstw_0933628822';
$username = 'zezprstw_0933628822';
$password = 'Minhkhoa2025';
$jwt_secret = 'credit-card-manager-jwt-secret-key-v1';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
    exit();
}

// Helper Functions
function getInput() {
    return json_decode(file_get_contents("php://input"), true) ?? [];
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

// Simple JWT Implementation
function generateJWT($payload, $secret) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($token, $secret) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    $header = $parts[0];
    $payload = $parts[1];
    $signature_provided = $parts[2];
    $signature = hash_hmac('sha256', $header . "." . $payload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if ($base64UrlSignature === $signature_provided) {
        return json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
    }
    return false;
}

function requireAuth() {
    global $jwt_secret;
    $headers = apache_request_headers();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $decoded = verifyJWT($token, $jwt_secret);
        if ($decoded) {
            return $decoded['userId'];
        }
    }
    jsonResponse(["error" => "Unauthorized"], 401);
}

// Router Logic
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Loại bỏ query string và prefix /api/
$path = parse_url($request_uri, PHP_URL_PATH);
$path = preg_replace('#^/api/#', '', $path);
$path = trim($path, '/');
$segments = explode('/', $path);

$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// --- API ENDPOINTS ---

// 1. Auth
if ($resource === 'login' && $method === 'POST') {
    $input = getInput();
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username) || empty($password)) {
        jsonResponse(['error' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Debug: jsonResponse(['error' => 'User not found: ' . $username], 401);
        jsonResponse(['error' => 'Tài khoản không tồn tại'], 401);
    }

    // Check plain text OR hashed password
    // Note: $user['password'] from DB might have whitespace if manually edited, so we trim it too for plain text check
    $dbPassword = $user['password'];
    $isPasswordCorrect = ($password === $dbPassword) || password_verify($password, $dbPassword);

    if ($isPasswordCorrect) {
        $token = generateJWT(['userId' => $user['id'], 'exp' => time() + 86400], $jwt_secret);
        jsonResponse(['success' => true, 'username' => $user['username'], 'token' => $token]);
    } else {
        jsonResponse(['error' => 'Mật khẩu không đúng'], 401);
    }
}

if ($resource === 'me' && $method === 'GET') {
    $userId = requireAuth();
    $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    jsonResponse(['loggedIn' => true, 'user' => $user]);
}

// 2. Customers
if ($resource === 'customers') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM customers ORDER BY name ASC");
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'POST') {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("INSERT INTO customers (name, phone, note) VALUES (?, ?, ?)");
        $stmt->execute([$input['name'], $input['phone'], $input['note']]);
        jsonResponse(['id' => $pdo->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("UPDATE customers SET name = ?, phone = ?, note = ? WHERE id = ?");
        $stmt->execute([$input['name'], $input['phone'], $input['note'], $id]);
        jsonResponse(['success' => true]);
    }
    if ($method === 'DELETE' && $id) {
        requireAuth();
        // Delete related data manually due to potential lack of CASCADE support in some MyISAM engines, 
        // though InnoDB handles it. We'll rely on DB constraints defined in database.sql but add manual cleanup for safety.
        $pdo->prepare("DELETE FROM transactions WHERE card_id IN (SELECT id FROM cards WHERE holder_id IN (SELECT id FROM card_holders WHERE customer_id = ?))")->execute([$id]);
        $pdo->prepare("DELETE FROM cards WHERE holder_id IN (SELECT id FROM card_holders WHERE customer_id = ?)")->execute([$id]);
        $pdo->prepare("DELETE FROM card_holders WHERE customer_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM customers WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// 3. Card Holders
if ($resource === 'card-holders') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT ch.*, c.name as customer_name FROM card_holders ch JOIN customers c ON ch.customer_id = c.id ORDER BY ch.holder_name ASC");
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'POST') {
        requireAuth();
        $input = getInput();
        // Kiểm tra xem đã tồn tại chưa để tránh trùng lặp
        $stmt = $pdo->prepare("SELECT id FROM card_holders WHERE customer_id = ? AND holder_name = ?");
        $stmt->execute([$input['customer_id'], $input['holder_name']]);
        $exist = $stmt->fetch();
        
        if ($exist) {
            jsonResponse(['id' => $exist['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO card_holders (customer_id, holder_name) VALUES (?, ?)");
            $stmt->execute([$input['customer_id'], $input['holder_name']]);
            jsonResponse(['id' => $pdo->lastInsertId()]);
        }
    }
}

// 4. Banks
if ($resource === 'banks') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM banks ORDER BY bank_name ASC");
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'POST') {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("INSERT INTO banks (bank_name, pos_fee_percent) VALUES (?, ?)");
        $stmt->execute([$input['bank_name'], $input['pos_fee_percent']]);
        jsonResponse(['id' => $pdo->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("UPDATE banks SET bank_name = ?, pos_fee_percent = ? WHERE id = ?");
        $stmt->execute([$input['bank_name'], $input['pos_fee_percent'], $id]);
        jsonResponse(['success' => true]);
    }
    if ($method === 'DELETE' && $id) {
        requireAuth();
        $stmt = $pdo->prepare("SELECT count(*) as count FROM cards WHERE bank_id = ?");
        $stmt->execute([$id]);
        if ($stmt->fetch()['count'] > 0) {
            jsonResponse(['error' => "Không thể xóa ngân hàng đã có thẻ liên kết"], 400);
        }
        $pdo->prepare("DELETE FROM banks WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// 5. Cards
if ($resource === 'cards') {
    if ($method === 'GET') {
        $sql = "SELECT c.*, ch.holder_name, b.bank_name, b.pos_fee_percent, cust.name as customer_name, cust.id as customer_id
                FROM cards c
                JOIN card_holders ch ON c.holder_id = ch.id
                JOIN banks b ON c.bank_id = b.id
                JOIN customers cust ON ch.customer_id = cust.id
                ORDER BY cust.name ASC";
        $stmt = $pdo->query($sql);
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'POST') {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("INSERT INTO cards (holder_id, bank_id, last4, credit_limit, billing_day, customer_fee_percent) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['holder_id'], $input['bank_id'], $input['last4'], 
            $input['credit_limit'], $input['billing_day'], $input['customer_fee_percent'] ?? 1.7
        ]);
        jsonResponse(['id' => $pdo->lastInsertId()]);
    }
    if ($method === 'PUT' && $id) {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("UPDATE cards SET holder_id = ?, bank_id = ?, last4 = ?, credit_limit = ?, billing_day = ?, customer_fee_percent = ? WHERE id = ?");
        $stmt->execute([
            $input['holder_id'], $input['bank_id'], $input['last4'], 
            $input['credit_limit'], $input['billing_day'], $input['customer_fee_percent'], $id
        ]);
        jsonResponse(['success' => true]);
    }
    if ($method === 'DELETE' && $id) {
        requireAuth();
        $pdo->prepare("DELETE FROM transactions WHERE card_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM cards WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// 6. Transactions
if ($resource === 'transactions') {
    if ($method === 'GET') {
        $sql = "SELECT t.*, c.last4, b.bank_name, ch.holder_name, cust.name as customer_name
                FROM transactions t
                JOIN cards c ON t.card_id = c.id
                JOIN banks b ON c.bank_id = b.id
                JOIN card_holders ch ON c.holder_id = ch.id
                JOIN customers cust ON ch.customer_id = cust.id
                ORDER BY t.dao_date DESC, t.id DESC";
        $stmt = $pdo->query($sql);
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'POST') {
        requireAuth();
        $input = getInput();
        $sql = "INSERT INTO transactions (card_id, dao_amount, bank_fee_percent, customer_fee_percent, bank_fee_amount, customer_fee_amount, net_profit, status, dao_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['card_id'], $input['dao_amount'], $input['bank_fee_percent'], 
            $input['customer_fee_percent'], $input['bank_fee_amount'], $input['customer_fee_amount'], 
            $input['net_profit'], $input['status'], $input['dao_date']
        ]);
        jsonResponse(['id' => $pdo->lastInsertId()]);
    }
    if ($method === 'DELETE' && $id) {
        requireAuth();
        $pdo->prepare("DELETE FROM transactions WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
    // Handle PATCH /api/transactions/:id/status
    if ($method === 'PATCH' && $id && $action === 'status') {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("UPDATE transactions SET status = ? WHERE id = ?");
        $stmt->execute([$input['status'], $id]);
        jsonResponse(['success' => true]);
    }
}

// 7. Settings
if ($resource === 'settings') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM settings LIMIT 1");
        jsonResponse($stmt->fetch());
    }
    if ($method === 'POST') {
        requireAuth();
        $input = getInput();
        $stmt = $pdo->prepare("UPDATE settings SET default_customer_fee_percent = ? WHERE id = 1");
        $stmt->execute([$input['default_customer_fee_percent']]);
        jsonResponse(['success' => true]);
    }
}

// 8. Stats
if ($resource === 'stats') {
    $currentMonth = date('Y-m');
    $stmt = $pdo->prepare("SELECT SUM(net_profit) as total FROM transactions WHERE dao_date LIKE ? AND status != 'dang_dao'");
    $stmt->execute([$currentMonth . '%']);
    $result = $stmt->fetch();
    jsonResponse(['monthlyProfit' => $result['total'] ?? 0]);
}

jsonResponse(['error' => 'Not Found'], 404);
?>
