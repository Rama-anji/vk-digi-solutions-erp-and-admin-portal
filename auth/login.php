<?php
/**
 * ============================================================================
 * VK DIGI SOLUTIONS (VKD SOLUTIONS) - ERP & ADMIN PORTAL
 * Authentication Module: Admin Login (auth/login.php)
 * ============================================================================
 */

require_once __DIR__ . '/../config.php';

// If already authenticated, redirect straight to dashboard
if (isLoggedIn()) {
    redirect(APP_URL . '/dashboard.php');
}

$error = '';
$email = '';

// Handle POST authentication request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCSRFToken($token)) {
        $error = 'Security session expired. Please refresh the page and try again.';
    } else {
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($email) || empty($password)) {
            $error = 'Please enter both your work email and password.';
        } else {
            try {
                $pdo = getDBConnection();
                $stmt = $pdo->prepare("SELECT * FROM admins WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
                $admin = $stmt->fetch();

                $isValidPassword = false;
                if ($admin) {
                    // Check standard bcrypt hash OR fallback for seed transition
                    if (password_verify($password, $admin['password']) || ($admin['password'] === 'admin123' && $password === 'admin123')) {
                        $isValidPassword = true;
                        
                        // Automatically rehash plaintext or older algorithm hashes
                        if (password_needs_rehash($admin['password'], PASSWORD_DEFAULT)) {
                            $newHash = password_hash($password, PASSWORD_DEFAULT);
                            $upd = $pdo->prepare("UPDATE admins SET password = ? WHERE id = ?");
                            $upd->execute([$newHash, $admin['id']]);
                        }
                    }
                }

                if ($admin && $isValidPassword) {
                    if ($admin['status'] !== 'Active') {
                        $error = 'Your administrator account has been suspended or deactivated. Contact Super Admin.';
                    } else {
                        // Regenerate session ID to prevent session fixation attacks
                        session_regenerate_id(true);
                        
                        $_SESSION['vkd_admin_id'] = $admin['id'];
                        $_SESSION['vkd_admin_name'] = $admin['name'];
                        $_SESSION['vkd_admin_email'] = $admin['email'];
                        $_SESSION['vkd_admin_role'] = $admin['role'];

                        // Log this successful sign-in
                        logActivity($pdo, (int)$admin['id'], 'User signed in to Admin Portal from IP ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));

                        // Redirect to main ERP Dashboard
                        redirect('../dashboard.php');
                    }
                } else {
                    $error = 'Invalid email address or password. Please verify your credentials.';
                }
            } catch (Exception $e) {
                $error = 'System error: ' . $e->getMessage();
            }
        }
    }
}

$csrfToken = generateCSRFToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In &mdash; <?php echo APP_NAME; ?> ERP Portal</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: {
                            blue: '#004077',
                            navy: '#00355F',
                            orange: '#EF7C00',
                            orangeHover: '#D96F00',
                            canvas: '#F8FAFC',
                            border: '#E5E7EB'
                        }
                    }
                }
            }
        }
    </script>
    <!-- FontAwesome 6 Icons CDN -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <style>
        body {
            background-color: #F8FAFC;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between text-slate-800">

    <!-- Top Brand Header Bar -->
    <header class="w-full bg-white border-b border-slate-200 py-3 px-6 shadow-xs">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-[#004077] flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-900/20">
                    <span>VK</span>
                </div>
                <div>
                    <h1 class="font-bold text-[#004077] text-lg leading-tight tracking-tight"><?php echo APP_NAME; ?></h1>
                    <p class="text-xs text-slate-500 font-medium tracking-wide uppercase"><?php echo APP_TAGLINE; ?></p>
                </div>
            </div>
            <div class="hidden sm:flex items-center space-x-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Hostinger Secure Node &bull; PHP 8.2</span>
            </div>
        </div>
    </header>

    <!-- Main Authentication Viewport -->
    <main class="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div class="w-full max-w-md">
            
            <!-- Login Card -->
            <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-[#E5E7EB] p-8 sm:p-10 relative overflow-hidden">
                
                <!-- Decorative Top Blue Accent Bar -->
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#004077] via-[#00355F] to-[#EF7C00]"></div>

                <!-- Card Heading -->
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#004077] mb-3 border border-blue-100">
                        <i class="fa-solid fa-shield-halved text-2xl"></i>
                    </div>
                    <h2 class="text-2xl font-black text-[#004077] tracking-tight">Admin Portal Sign In</h2>
                    <p class="text-xs text-slate-500 mt-1">Authorized personnel only. Access client records, billing & renewals.</p>
                </div>

                <!-- Error Notice -->
                <?php if (!empty($error)): ?>
                    <div class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-3">
                        <i class="fa-solid fa-triangle-exclamation text-base mt-0.5 text-red-500 shrink-0"></i>
                        <span><?php echo htmlspecialchars($error); ?></span>
                    </div>
                <?php endif; ?>

                <!-- Login Form -->
                <form action="login.php" method="POST" class="space-y-5" id="loginForm">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken); ?>">

                    <!-- Email Field -->
                    <div>
                        <label for="email" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                            Work Email Address
                        </label>
                        <div class="relative rounded-xl shadow-xs">
                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <i class="fa-solid fa-envelope text-sm"></i>
                            </div>
                            <input type="email" name="email" id="email" required value="<?php echo htmlspecialchars($email); ?>"
                                placeholder="name@vkdsolutions.com"
                                class="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] focus:border-transparent transition" />
                        </div>
                    </div>

                    <!-- Password Field -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label for="password" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Password
                            </label>
                            <a href="javascript:void(0)" onclick="alert('For password resets, contact Super Admin or update hash in phpMyAdmin admins table.');" class="text-xs font-medium text-[#EF7C00] hover:text-[#D96F00] transition">
                                Forgot password?
                            </a>
                        </div>
                        <div class="relative rounded-xl shadow-xs">
                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <i class="fa-solid fa-lock text-sm"></i>
                            </div>
                            <input type="password" name="password" id="password" required
                                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                                class="block w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] focus:border-transparent transition" />
                            <button type="button" onclick="togglePasswordVisibility()" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition">
                                <i class="fa-regular fa-eye" id="togglePasswordIcon"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Remember Me Option -->
                    <div class="flex items-center justify-between pt-1">
                        <label class="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" name="remember" class="w-4 h-4 rounded text-[#004077] focus:ring-[#004077] border-slate-300">
                            <span>Keep me signed in for 7 days</span>
                        </label>
                    </div>

                    <!-- Submit CTA Button -->
                    <button type="submit"
                        class="w-full py-3.5 px-6 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition duration-150 ease-in-out flex items-center justify-center space-x-2 text-sm tracking-wide">
                        <span>Sign In to Dashboard</span>
                        <i class="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                </form>

                <!-- Quick-Fill 1-Click Demo Credentials Badge -->
                <div class="mt-6 pt-6 border-t border-slate-100">
                    <div class="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                            <div class="flex items-center space-x-1.5 text-xs font-semibold text-[#004077]">
                                <i class="fa-solid fa-key text-[11px] text-[#EF7C00]"></i>
                                <span>Default Admin Credentials</span>
                            </div>
                            <p class="text-[11px] text-slate-600 mt-0.5">admin@vkdsolutions.com &bull; admin123</p>
                        </div>
                        <button type="button" onclick="fillDemoCredentials()" class="px-3 py-1.5 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0">
                            Auto Fill
                        </button>
                    </div>
                </div>

            </div>

            <!-- Hostinger Deployment Note -->
            <div class="mt-6 text-center text-xs text-slate-500 space-y-1">
                <p>&copy; <?php echo date('Y'); ?> <?php echo COMPANY_LEGAL_NAME; ?>. All rights reserved.</p>
                <p class="text-[11px] text-slate-400">Direct Hostinger Linux Deploy &bull; Zero NPM / Zero Composer Dependencies</p>
            </div>

        </div>
    </main>

    <!-- Simple Vanilla JS for Password Visibility and Quick-Fill -->
    <script>
        function togglePasswordVisibility() {
            const pwdField = document.getElementById('password');
            const icon = document.getElementById('togglePasswordIcon');
            if (pwdField.type === 'password') {
                pwdField.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                pwdField.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }

        function fillDemoCredentials() {
            document.getElementById('email').value = 'admin@vkdsolutions.com';
            document.getElementById('password').value = 'admin123';
            const emailInput = document.getElementById('email');
            emailInput.classList.add('ring-2', 'ring-[#004077]');
            setTimeout(() => {
                emailInput.classList.remove('ring-2', 'ring-[#004077]');
            }, 600);
        }
    </script>
</body>
</html>
