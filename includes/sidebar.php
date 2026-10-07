<?php
/**
 * VK Digi Solutions (VKD Solutions) - Enterprise ERP & Admin Portal
 * Sidebar Navigation Template - Hostinger Linux Shared Web Hosting (PHP 8.1/8.2)
 */
$currentScript = basename($_SERVER['PHP_SELF']);
?>
<aside id="sidebar" class="w-64 bg-[#004077] text-white flex flex-col justify-between shrink-0 no-print transition-all duration-300 z-30">
    
    <!-- Brand Header -->
    <div>
        <div class="h-16 flex items-center px-6 border-b border-white/10">
            <a href="<?php echo APP_URL; ?>/dashboard.php" class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-white text-[#004077] flex items-center justify-center font-black text-lg shadow-sm">
                    VK
                </div>
                <div>
                    <h1 class="font-bold text-sm tracking-tight leading-none text-white">VK DIGI SOLUTIONS</h1>
                    <p class="text-[10px] text-blue-200 uppercase tracking-wider font-semibold mt-0.5">Admin &amp; ERP Portal</p>
                </div>
            </a>
        </div>

        <!-- Navigation Menu -->
        <nav class="p-3 space-y-1 text-xs">
            
            <a href="<?php echo APP_URL; ?>/dashboard.php" class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition <?php echo ($currentScript === 'dashboard.php') ? 'bg-[#EF7C00] font-bold shadow-sm text-white' : 'text-blue-100 hover:bg-[#00355F] hover:text-white'; ?>">
                <i class="fa-solid fa-gauge-high w-4 text-center"></i>
                <span>Executive Dashboard</span>
            </a>

            <a href="<?php echo APP_URL; ?>/clients/index.php" class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition <?php echo (strpos($currentScript, 'client') !== false) ? 'bg-[#EF7C00] font-bold shadow-sm text-white' : 'text-blue-100 hover:bg-[#00355F] hover:text-white'; ?>">
                <i class="fa-solid fa-users w-4 text-center"></i>
                <span>Clients Directory</span>
            </a>

            <a href="<?php echo APP_URL; ?>/renewals/index.php" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl transition <?php echo (strpos($currentScript, 'renewal') !== false) ? 'bg-[#EF7C00] font-bold shadow-sm text-white' : 'text-blue-100 hover:bg-[#00355F] hover:text-white'; ?>">
                <div class="flex items-center space-x-3">
                    <i class="fa-solid fa-arrows-rotate w-4 text-center"></i>
                    <span>Subscriptions &amp; Renewals</span>
                </div>
                <?php if (isset($expiringCount) && $expiringCount > 0): ?>
                    <span class="px-2 py-0.5 bg-[#EF7C00] text-white rounded-full text-[10px] font-black animate-pulse">
                        <?php echo $expiringCount; ?>
                    </span>
                <?php endif; ?>
            </a>

            <a href="<?php echo APP_URL; ?>/invoices/index.php" class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition <?php echo (strpos($currentScript, 'invoice') !== false) ? 'bg-[#EF7C00] font-bold shadow-sm text-white' : 'text-blue-100 hover:bg-[#00355F] hover:text-white'; ?>">
                <i class="fa-solid fa-receipt w-4 text-center"></i>
                <span>Invoices &amp; 18% GST</span>
            </a>

            <a href="<?php echo APP_URL; ?>/vendors/bills.php" class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition <?php echo (strpos($currentScript, 'vendor') !== false) ? 'bg-[#EF7C00] font-bold shadow-sm text-white' : 'text-blue-100 hover:bg-[#00355F] hover:text-white'; ?>">
                <i class="fa-solid fa-building w-4 text-center"></i>
                <span>Vendor Expenses Ledger</span>
            </a>

            <a href="<?php echo APP_URL; ?>/hr/documents.php" class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition <?php echo (strpos($currentScript, 'document') !== false || strpos($currentScript, 'hr') !== false) ? 'bg-[#EF7C00] font-bold shadow-sm text-white' : 'text-blue-100 hover:bg-[#00355F] hover:text-white'; ?>">
                <i class="fa-solid fa-file-contract w-4 text-center"></i>
                <span>HR Desk &amp; Letters</span>
            </a>

            <a href="<?php echo APP_URL; ?>/vault/index.php" class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition text-blue-100 hover:bg-[#00355F] hover:text-white">
                <i class="fa-solid fa-key w-4 text-center"></i>
                <span>Credential Vault</span>
            </a>

        </nav>
    </div>

    <!-- Sidebar Bottom Status -->
    <div class="p-4 border-t border-white/10 text-xs">
        <div class="flex items-center space-x-2 text-[11px] text-blue-200">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Hostinger Linux (PHP <?php echo PHP_VERSION; ?>)</span>
        </div>
        <div class="mt-2 text-[10px] text-blue-300">
            VK Digi Solutions ERP v1.0
        </div>
    </div>

</aside>
