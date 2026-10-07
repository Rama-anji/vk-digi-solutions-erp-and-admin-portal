<?php
/**
 * VK Digi Solutions (VKD Solutions) - Enterprise ERP & Admin Portal
 * Header Template - Hostinger Linux Shared Web Hosting (PHP 8.1/8.2)
 */
require_once __DIR__ . '/../config.php';
require_login();
$adminUser = current_user();

// Fetch renewal alerts count (services expiring in <= 15 days)
$pdo = get_db_connection();
$expiringStmt = $pdo->query("SELECT COUNT(*) as count FROM client_subscriptions WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 15 DAY) AND status != 'Cancelled'");
$expiringCount = $expiringStmt ? (int)$expiringStmt->fetch()['count'] : 0;
?>
<!DOCTYPE html>
<html lang="en" class="h-full bg-[#F8FAFC]">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? htmlspecialchars($pageTitle) . ' - ' : ''; ?>VK Digi Solutions ERP</title>
    
    <!-- Tailwind CSS (CDN - Zero build step for Hostinger) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        vkd: {
                            blue: '#004077',
                            navy: '#00355F',
                            orange: '#EF7C00',
                            orangeHover: '#D96F00',
                            bg: '#F8FAFC',
                            surface: '#FFFFFF',
                            border: '#E5E7EB'
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- FontAwesome 6 Icons (CDN) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    
    <!-- Google Fonts: Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Print CSS for Invoices & HR Documents -->
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        @media print {
            .no-print, header, aside, .topbar, #sidebar { display: none !important; }
            main { padding: 0 !important; margin: 0 !important; }
            .printable-card { box-shadow: none !important; border: none !important; width: 100% !important; }
        }
    </style>
</head>
<body class="h-full flex overflow-hidden text-slate-800">
    
    <!-- Sidebar Include -->
    <?php include_once __DIR__ . '/sidebar.php'; ?>

    <!-- Main Viewport Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <!-- Topbar -->
        <header class="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between z-20 shrink-0 no-print">
            <div class="flex items-center space-x-3">
                <button id="sidebar-toggle" class="p-2 rounded-xl hover:bg-slate-100 text-slate-500 lg:hidden">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="relative w-64 md:w-80">
                    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input type="text" placeholder="Search clients, invoices, domains..." class="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] focus:bg-white transition">
                </div>
            </div>

            <div class="flex items-center space-x-4">
                <!-- Expiry Notification Icon -->
                <a href="<?php echo APP_URL; ?>/renewals/index.php" class="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition" title="<?php echo $expiringCount; ?> renewals due soon">
                    <i class="fa-solid fa-bell text-sm"></i>
                    <?php if ($expiringCount > 0): ?>
                        <span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EF7C00] text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                            <?php echo $expiringCount; ?>
                        </span>
                    <?php endif; ?>
                </a>

                <!-- + New Client Quick Button -->
                <a href="<?php echo APP_URL; ?>/clients/add.php" class="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-sm transition">
                    <i class="fa-solid fa-plus text-xs"></i>
                    <span>New Client</span>
                </a>

                <!-- User Profile -->
                <div class="flex items-center space-x-2.5 pl-2">
                    <div class="w-8 h-8 rounded-lg bg-[#004077] text-white flex items-center justify-center font-bold text-xs">
                        <?php echo strtoupper(substr($adminUser['name'] ?? 'A', 0, 2)); ?>
                    </div>
                    <div class="hidden md:block text-left text-xs leading-tight">
                        <p class="font-bold text-slate-800"><?php echo htmlspecialchars($adminUser['name'] ?? 'Admin'); ?></p>
                        <p class="text-[10px] text-slate-500"><?php echo htmlspecialchars($adminUser['role'] ?? 'Super Admin'); ?></p>
                    </div>
                    <a href="<?php echo APP_URL; ?>/auth/logout.php" class="text-slate-400 hover:text-red-600 transition ml-2" title="Sign Out">
                        <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                    </a>
                </div>
            </div>
        </header>

        <!-- Main Content Scroll Area -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div class="max-w-7xl mx-auto">
