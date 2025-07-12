// Supabase配置 - 请替换为您的Supabase项目信息
const supabaseUrl = 'https://xjsebsjutctfvbbbspty.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqc2Vic2p1dGN0ZnZiYmJzcHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDkxMDIsImV4cCI6MjA2NzgyNTEwMn0.eU9NLqu80YLimg-K_NkWuGZcO2ox82qxMKk_pN8h4Ww';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM元素
const loginModal = document.getElementById('login-modal');
const adminDashboard = document.getElementById('admin-dashboard');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const visitorTableBody = document.getElementById('visitor-table-body');
const totalVisitsElement = document.getElementById('total-visits');
const todayVisitsElement = document.getElementById('today-visits');
const totalDrawsElement = document.getElementById('total-draws');
const todayDrawsElement = document.getElementById('today-draws');
const claimedPrizesElement = document.getElementById('claimed-prizes');
const claimRateElement = document.getElementById('claim-rate');
const showingCountElement = document.getElementById('showing-count');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');

// 状态变量
let currentPage = 1;
const pageSize = 10;
let totalPages = 1;
let visitorMap = null;
let markers = [];
let prizeChart = null;
let trendChart = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否已登录
    if (localStorage.getItem('adminLoggedIn')) {
        loginModal.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        initDashboard();
    }

    // 登录按钮事件
    loginBtn.addEventListener('click', handleLogin);

    // 按Enter键登录
    usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    // 退出按钮事件
    logoutBtn.addEventListener('click', handleLogout);

    // 分页按钮事件
    prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadVisitorRecords(); } });
    nextPageBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; loadVisitorRecords(); } });
});

// 处理登录
function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // 简单的本地验证 (实际项目中应该使用更安全的验证方式)
    if (username === 'admin' && password === 'admin') {
        localStorage.setItem('adminLoggedIn', 'true');
        loginModal.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        initDashboard();
    } else {
        loginError.classList.remove('hidden');
        setTimeout(() => loginError.classList.add('hidden'), 3000);
    }
}

// 处理退出
function handleLogout() {
    localStorage.removeItem('adminLoggedIn');
    adminDashboard.classList.add('hidden');
    loginModal.classList.remove('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
}

// 初始化仪表盘
function initDashboard() {
    initMap();
    loadStatistics();
    loadVisitorRecords();
    initCharts();
}

// 初始化地图
function initMap() {
    // 初始化高德地图
    visitorMap = new AMap.Map('visitor-map', {
        zoom: 4,
        center: [105.7022, 34.2652], // 中国中心点
        resizeEnable: true
    });

    // 添加地图控件
    visitorMap.addControl(new AMap.ToolBar({
        position: 'RB'
    }));

    loadVisitorLocations();
}

// 加载访问者位置
async function loadVisitorLocations() {
    try {
        const { data, error } = await supabase
            .from('draw_records')
            .select('latitude, longitude, prize_name')
            .neq('latitude', null)
            .neq('longitude', null);

        if (error) throw error;

        // 清除现有标记
        markers.forEach(marker => marker.remove());
        markers = [];

        // 添加新标记
        data.forEach(record => {
            if (record.latitude && record.longitude) {
                const marker = new AMap.Marker({
                    position: [record.longitude, record.latitude],
                    title: record.prize_name,
                    icon: new AMap.Icon({
                        size: new AMap.Size(30, 30),
                        image: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
                        imageSize: new AMap.Size(30, 30)
                    })
                });

                marker.setMap(visitorMap);
                markers.push(marker);

                // 添加信息窗口
                const infoWindow = new AMap.InfoWindow({
                    content: `<div style="padding: 10px;"><b>奖品:</b> ${record.prize_name}</div>`,
                    offset: new AMap.Pixel(0, -30)
                });

                marker.on('click', () => infoWindow.open(visitorMap, marker.getPosition()));
            }
        });

        // 如果有标记，调整地图视野以显示所有标记
        if (markers.length > 0) {
            const bounds = new AMap.Bounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            visitorMap.setBounds(bounds, false, [50, 50, 50, 50]);
        }
    } catch (error) {
        console.error('加载访问者位置失败:', error);
    }
}

// 加载统计数据
async function loadStatistics() {
    try {
        // 获取今天的日期
        const today = new Date().toISOString().split('T')[0];

        // 获取总访问量
        const { data: totalVisitsData, error: visitsError } = await supabase
            .from('draw_records')
            .select('count', { count: 'exact', head: true });

        // 获取今日访问量
        const { data: todayVisitsData, error: todayVisitsError } = await supabase
            .from('draw_records')
            .select('count', { count: 'exact', head: true })
            .gte('draw_time', today);

        // 获取总抽奖次数 (与总访问量相同)
        // 获取今日抽奖次数 (与今日访问量相同)

        // 获取已领取奖品数量
        const { data: claimedData, error: claimedError } = await supabase
            .from('draw_records')
            .select('count', { count: 'exact', head: true })
            .eq('claimed', true);

        if (visitsError || todayVisitsError || claimedError) throw visitsError || todayVisitsError || claimedError;

        // 更新统计数据
        totalVisitsElement.textContent = totalVisitsData.count || 0;
        todayVisitsElement.textContent = todayVisitsData.count || 0;
        totalDrawsElement.textContent = totalVisitsData.count || 0;
        todayDrawsElement.textContent = todayVisitsData.count || 0;
        claimedPrizesElement.textContent = claimedData.count || 0;

        // 计算领取率
        const claimRate = totalVisitsData.count > 0 ? Math.round((claimedData.count / totalVisitsData.count) * 100) : 0;
        claimRateElement.textContent = `${claimRate}%`;
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 加载访问记录
async function loadVisitorRecords() {
    try {
        // 获取总记录数
        const { data: countData, error: countError } = await supabase
            .from('draw_records')
            .select('count', { count: 'exact', head: true });

        if (countError) throw countError;

        // 计算总页数
        totalPages = Math.ceil((countData.count || 0) / pageSize);

        // 更新分页按钮状态
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;

        // 获取当前页数据
        const { data, error } = await supabase
            .from('draw_records')
            .select('*')
            .order('draw_time', { ascending: false })
            .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

        if (error) throw error;

        // 更新显示计数
        showingCountElement.textContent = data.length || 0;

        // 渲染表格
        if (data.length === 0) {
            visitorTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                        <i class="fa fa-inbox mr-2"></i> 暂无访问记录
                    </td>
                </tr>
            `;
            return;
        }

        visitorTableBody.innerHTML = data.map(record => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(record.draw_time)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.ip_address || '未知'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${record.address || '未知位置'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="showPrizeDetails(${JSON.stringify(record)})">
                        <i class="fa fa-gift mr-1"></i> 奖品
                    </button>
                    <button class="text-green-600 hover:text-green-900" onclick="showLocation(${record.longitude}, ${record.latitude})">
                        <i class="fa fa-map-marker mr-1"></i> 位置
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载访问记录失败:', error);
        visitorTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-10 text-center text-red-500">
                    <i class="fa fa-exclamation-circle mr-2"></i> 加载失败，请刷新页面重试
                </td>
            </tr>
        `;
    }
}

// 初始化图表
function initCharts() {
    // 奖品分布图表
    const prizeCtx = document.getElementById('prize-chart').getContext('2d');
    prizeChart = new Chart(prizeCtx, {
        type: 'doughnut',
        data: {
            labels: ['一等奖', '二等奖', '三等奖', '四等奖', '五等奖'],
            datasets: [{ 
                data: [5, 15, 20, 30, 30],
                backgroundColor: ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });

    // 访问趋势图表
    const trendCtx = document.getElementById('trend-chart').getContext('2d');
    const dates = [];
    const today = new Date();

    // 生成过去7天的日期
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date.toLocaleDateString());
    }

    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '访问量',
                data: [12, 19, 15, 28, 22, 35, 29],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // 加载实际数据更新图表
    loadChartData();
}

// 加载图表数据
async function loadChartData() {
    try {
        // 获取奖品分布数据
        const { data: prizeData, error: prizeError } = await supabase
            .from('draw_records')
            .select('prize_id, count(prize_id) as count')
            .group('prize_id');

        // 获取过去7天访问数据
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: trendData, error: trendError } = await supabase
            .from('draw_records')
            .select('draw_time::date as date, count(*) as count')
            .gte('draw_time', sevenDaysAgo.toISOString())
            .group('date')
            .order('date');

        if (prizeError || trendError) throw prizeError || trendError;

        // 更新奖品分布图表
        if (prizeData && prizeData.length > 0) {
            const prizeCounts = [0, 0, 0, 0, 0]; // 对应5个奖品
            prizeData.forEach(item => {
                const index = parseInt(item.prize_id) - 1;
                if (index >= 0 && index < 5) {
                    prizeCounts[index] = parseInt(item.count);
                }
            });
            prizeChart.data.datasets[0].data = prizeCounts;
            prizeChart.update();
        }

        // 更新访问趋势图表
        if (trendData && trendData.length > 0) {
            const dates = trendData.map(item => new Date(item.date).toLocaleDateString());
            const counts = trendData.map(item => parseInt(item.count));
            trendChart.data.labels = dates;
            trendChart.data.datasets[0].data = counts;
            trendChart.update();
        }
    } catch (error) {
        console.error('加载图表数据失败:', error);
    }
}

// 显示奖品详情
function showPrizeDetails(record) {
    // 创建弹窗内容
    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="prize-modal">
            <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all animate-fadeIn">
                <div class="text-center">
                    <div class="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <img src="${record.prize_icon}" alt="${record.prize_name}" width="80" height="80">
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${record.prize_name}</h3>
                    <p class="text-gray-500 mb-6">抽奖时间: ${formatDate(record.draw_time)}</p>
                    <button onclick="document.getElementById('prize-modal').remove()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow transform transition hover:scale-105 focus:outline-none">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    `;

    // 添加弹窗到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 显示位置
function showLocation(longitude, latitude) {
    if (!longitude || !latitude) {
        alert('没有可用的位置信息');
        return;
    }

    // 在地图上显示位置
    visitorMap.setZoom(15);
    visitorMap.setCenter([longitude, latitude]);

    // 添加临时标记
    const tempMarker = new AMap.Marker({
        position: [longitude, latitude],
        icon: new AMap.Icon({
            size: new AMap.Size(40, 40),
            image: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
            imageSize: new AMap.Size(40, 40)
        })
    });

    tempMarker.setMap(visitorMap);

    // 3秒后移除临时标记
    setTimeout(() => tempMarker.remove(), 3000);
}

// 格式化日期时间
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}