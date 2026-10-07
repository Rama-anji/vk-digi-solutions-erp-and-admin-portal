            </div>
        </main>

        <!-- Footer Bar -->
        <footer class="bg-white border-t border-[#E5E7EB] py-3 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between no-print shrink-0">
            <div>
                &copy; <?php echo date('Y'); ?> <strong>VK Digi Solutions Pvt. Ltd.</strong> All rights reserved.
            </div>
            <div class="flex items-center space-x-4 text-[11px] text-slate-400 mt-1 sm:mt-0">
                <span>MySQL 8 / MariaDB</span>
                <span>&bull;</span>
                <span>Hostinger cPanel/hPanel Compatible</span>
                <span>&bull;</span>
                <button onclick="window.print()" class="text-[#004077] hover:underline font-semibold">
                    <i class="fa-solid fa-print mr-1"></i> Print View
                </button>
            </div>
        </footer>

    </div>

    <!-- Toggle Script for Mobile -->
    <script>
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('hidden');
            });
        }
    </script>
</body>
</html>
