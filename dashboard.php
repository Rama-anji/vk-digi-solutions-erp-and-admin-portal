<?php
/**
 * VK Digi Solutions (VKD Solutions) - Enterprise ERP & Admin Portal
 * Executive Dashboard - Hostinger Linux Shared Web Hosting (PHP 8.1/8.2)
 */
require_once __DIR__ . '/config.php';
require_login();
$pageTitle = 'Executive Dashboard';

$pdo = get_db_connection();

// 1. Total Active Clients
$activeClientsCount = 0;
$stmt = $pdo->query("SELECT COUNT(*) as count FROM clients WHERE status = 'Active'");
if ($stmt) {
    $activeClientsCount = (int)$stmt->fetch()['count'];
}

// 2. Services Expiring Soon (<= 15 days)
$expiringCount = 0;
$stmt = $pdo->query("SELECT COUNT(*) as count FROM client_subscriptions WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 15 DAY) AND status != 'Cancelled'");
if ($stmt) {
    $expiringCount = (int)$stmt->fetch()['count'];
}

// 3. Client Billing Financials
$totalInvoiced = 0.0;
$totalPaid = 0.0;
$stmt = $pdo->query("SELECT COALESCE(SUM(grand_total), 0) as total_invoiced, COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN grand_total ELSE 0 END), 0) as total_paid FROM invoices");
if ($stmt) {
    $res = $stmt->fetch();
    $totalInvoiced = (float)$res['total_invoiced'];
    $totalPaid = (float)$res['total_paid'];
}
$outstandingReceivables = calculate_client_balance($totalInvoiced, $totalPaid);

// 4. Vendor Payables
$totalVendorBills = 0.0;
$totalVendorAdvances = 0.0;
$stmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total_bills, COALESCE(SUM(advance_paid), 0) as total_advances FROM vendor_bills");
if ($stmt) {
    $res = $stmt->fetch();
    $totalVendorBills = (float)$res['total_bills'];
    $totalVendorAdvances = (float)$res['total_advances'];
}
$pendingVendorLiability = calculate_vendor_balance($totalVendorBills, $totalVendorAdvances);

// 5. Expiring Subscriptions List
$expiringSubs = [];
$stmt = $pdo->query("
    SELECT cs.*, c.name as client_name, s.service_name, s.category,
           DATEDIFF(cs.expiry_date, CURDATE()) as days_remaining
    FROM client_subscriptions cs
    JOIN clients c ON cs.client_id = c.id
    JOIN services_catalog s ON cs.service_id = s.id
    WHERE cs.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 15 DAY)
      AND cs.status != 'Cancelled'
    ORDER BY cs.expiry_date ASC
");
if ($stmt) {
    $expiringSubs = $stmt->fetchAll();
}

// 6. Recent Invoices
$recentInvoices = [];
$stmt = $pdo->query("
    SELECT i.*, c.name as client_name 
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    ORDER BY i.created_at DESC LIMIT 5
");
if ($stmt) {
    $recentInvoices = $stmt->fetchAll();
}

// 7. Recent Vendor Bills
$recentVendorBills = [];
$stmt = $pdo->query("
    SELECT vb.*, v.vendor_name 
    FROM vendor_bills vb
    JOIN vendors v ON vb.vendor_id = v.id
    ORDER BY vb.bill_date DESC LIMIT 5
");
if ($stmt) {
    $recentVendorBills = $stmt->fetchAll();
}

include_once __DIR__ . '/includes/header.php';
?>

<div class="space-y-6">
    
    <!-- Top Bar Welcome -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div>
            <div class="flex items-center space-x-2">
                <h1 class="text-xl font-black text-[#004077] tracking-tight">Agency Operations Control Center</h1>
                <span class="px-2 py-0.5 bg-blue-100 text-[#004077] text-[10px] font-bold rounded-md uppercase tracking-wider">
                    PHP 8.2 &bull; MySQL 8
                </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
                Real-time multi-service renewal telemetry, automated GST balance engine &amp; vendor ledgers.
            </p>
        </div>
        <div class="flex items-center space-x-2.5">
            <a href="<?php echo APP_URL; ?>/clients/add.php" class="px-3.5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5">
                <i class="fa-solid fa-user-plus text-xs"></i>
                <span>+ New Client</span>
            </a>
            <a href="<?php echo APP_URL; ?>/invoices/create.php" class="px-3.5 py-2 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 transition flex items-center space-x-1.5">
                <i class="fa-solid fa-receipt text-xs"></i>
                <span>Generate Invoice</span>
            </a>
        </div>
    </div>

    <!-- KPI Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Active Clients -->
        <div class="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Clients</span>
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-[#004077] flex items-center justify-center">
                    <i class="fa-solid fa-users text-sm"></i>
                </div>
            </div>
            <div class="mt-3">
                <h3 class="text-2xl font-black text-[#004077]"><?php echo $activeClientsCount; ?></h3>
                <p class="text-[11px] text-slate-500 mt-1">Corporate &amp; Government Accounts</p>
            </div>
        </div>

        <!-- 15-Day Renewal Alert Card -->
        <div class="bg-white p-5 rounded-2xl border border-orange-200 shadow-xs hover:shadow-md transition relative overflow-hidden">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-orange-700 uppercase tracking-wider">Expiring in &le; 15 Days</span>
                <div class="w-10 h-10 rounded-xl bg-orange-100 text-[#EF7C00] flex items-center justify-center font-bold">
                    <i class="fa-solid fa-clock text-sm"></i>
                </div>
            </div>
            <div class="mt-3">
                <h3 class="text-2xl font-black text-[#EF7C00]"><?php echo $expiringCount; ?> Services</h3>
                <p class="text-[11px] text-orange-600 font-semibold mt-1">Action required before suspension</p>
            </div>
        </div>

        <!-- Client Receivables -->
        <div class="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <i class="fa-solid fa-receipt text-sm"></i>
                </div>
            </div>
            <div class="mt-3">
                <h3 class="text-2xl font-black text-slate-800"><?php echo format_currency($totalInvoiced); ?></h3>
                <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Due:</span>
                    <span class="font-bold text-amber-600"><?php echo format_currency($outstandingReceivables); ?></span>
                </div>
            </div>
        </div>

        <!-- Vendor Liabilities -->
        <div class="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Liabilities</span>
                <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <i class="fa-solid fa-building text-sm"></i>
                </div>
            </div>
            <div class="mt-3">
                <h3 class="text-2xl font-black text-slate-800"><?php echo format_currency($pendingVendorLiability); ?></h3>
                <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Paid Advances:</span>
                    <span class="font-bold text-emerald-600"><?php echo format_currency($totalVendorAdvances); ?></span>
                </div>
            </div>
        </div>

    </div>

    <!-- 15-Day Renewal Alert Queue -->
    <div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#004077]/5">
            <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-lg bg-[#EF7C00] text-white flex items-center justify-center font-bold">
                    <i class="fa-solid fa-triangle-exclamation text-xs"></i>
                </div>
                <div>
                    <h2 class="font-bold text-sm text-[#004077]">Multi-Service Expiry &amp; Renewal Queue</h2>
                    <p class="text-[11px] text-slate-500">Automated 15-day cycle alerts &bull; Formula: (expiry_date - CURDATE() &le; 15)</p>
                </div>
            </div>
            <a href="<?php echo APP_URL; ?>/renewals/index.php" class="text-xs font-bold text-[#004077] hover:underline">
                View All Subscriptions &rarr;
            </a>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                        <th class="py-3 px-4">Client Name</th>
                        <th class="py-3 px-4">Service Scope</th>
                        <th class="py-3 px-4">Cycle</th>
                        <th class="py-3 px-4">Expiry Date</th>
                        <th class="py-3 px-4">Days Remaining</th>
                        <th class="py-3 px-4">Amount</th>
                        <th class="py-3 px-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (!empty($expiringSubs)): ?>
                        <?php foreach ($expiringSubs as $sub): ?>
                            <tr class="hover:bg-amber-50/50 transition">
                                <td class="py-3.5 px-4 font-bold text-slate-800">
                                    <?php echo htmlspecialchars($sub['client_name']); ?>
                                </td>
                                <td class="py-3.5 px-4">
                                    <span class="font-medium text-slate-700"><?php echo htmlspecialchars($sub['service_name']); ?></span>
                                    <span class="block text-[10px] text-slate-400"><?php echo htmlspecialchars($sub['category']); ?></span>
                                </td>
                                <td class="py-3.5 px-4">
                                    <span class="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                                        <?php echo htmlspecialchars($sub['billing_cycle']); ?>
                                    </span>
                                </td>
                                <td class="py-3.5 px-4 font-medium text-slate-600">
                                    <?php echo htmlspecialchars($sub['expiry_date']); ?>
                                </td>
                                <td class="py-3.5 px-4">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        <i class="fa-regular fa-clock mr-1"></i>
                                        <?php echo (int)$sub['days_remaining']; ?> days left
                                    </span>
                                </td>
                                <td class="py-3.5 px-4 font-bold text-slate-800">
                                    <?php echo format_currency($sub['amount']); ?>
                                </td>
                                <td class="py-3.5 px-4 text-right">
                                    <a href="<?php echo APP_URL; ?>/renewals/renew.php?id=<?php echo $sub['id']; ?>" class="px-3 py-1.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-lg shadow-xs transition">
                                        Renew Service
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7" class="py-8 text-center text-slate-400">
                                <i class="fa-solid fa-circle-check text-2xl text-emerald-500 mb-2 block"></i>
                                All client services are up-to-date. No renewals due in the next 15 days.
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Two-Column Grid: Invoices & Vendor Balances -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Invoices List -->
        <div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-sm text-[#004077]">Recent Agency Invoices (18% GST)</h3>
                <a href="<?php echo APP_URL; ?>/invoices/index.php" class="text-xs font-bold text-[#EF7C00] hover:underline">View All</a>
            </div>
            <div class="space-y-3">
                <?php foreach ($recentInvoices as $inv): ?>
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-xs text-slate-800"><?php echo htmlspecialchars($inv['invoice_number']); ?></span>
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold <?php echo $inv['payment_status'] === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'; ?>">
                                    <?php echo htmlspecialchars($inv['payment_status']); ?>
                                </span>
                            </div>
                            <p class="text-[11px] text-slate-500 mt-0.5"><?php echo htmlspecialchars($inv['client_name']); ?></p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-xs text-slate-800"><?php echo format_currency($inv['grand_total']); ?></p>
                            <p class="text-[10px] text-slate-400">Due: <?php echo htmlspecialchars($inv['due_date']); ?></p>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Vendor Payables -->
        <div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-sm text-[#004077]">Vendor Liabilities (Total - Advance = Pending)</h3>
                <a href="<?php echo APP_URL; ?>/vendors/bills.php" class="text-xs font-bold text-[#EF7C00] hover:underline">View Ledger</a>
            </div>
            <div class="space-y-3">
                <?php foreach ($recentVendorBills as $bill): ?>
                    <?php $pending = calculate_vendor_balance((float)$bill['total_amount'], (float)$bill['advance_paid']); ?>
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-xs text-slate-800"><?php echo htmlspecialchars($bill['project_name']); ?></span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold <?php echo $bill['status'] === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'; ?>">
                                <?php echo htmlspecialchars($bill['status']); ?>
                            </span>
                        </div>
                        <p class="text-[11px] text-slate-500 mt-0.5"><?php echo htmlspecialchars($bill['vendor_name']); ?></p>
                        <div class="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                            <span class="text-slate-500">Bill: <?php echo format_currency($bill['total_amount']); ?> &bull; Adv: <?php echo format_currency($bill['advance_paid']); ?></span>
                            <span class="font-bold text-indigo-700">Pending: <?php echo format_currency($pending); ?></span>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

    </div>

</div>

<?php include_once __DIR__ . '/includes/footer.php'; ?>
