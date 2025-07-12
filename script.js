document.addEventListener('DOMContentLoaded', async () => {
    // DOM元素引用
    const wheel = document.getElementById('wheel');
    const spinBtn = document.getElementById('spin-btn');
    const resultModal = document.getElementById('result-modal');
    const modalContent = document.getElementById('modal-content');
    const resultImage = document.getElementById('result-image');
    const resultText = document.getElementById('result-text');
    const confirmBtn = document.getElementById('confirm-btn');
    const recordList = document.getElementById('record-list');
    const claimModal = document.getElementById('claim-modal');
    const wechatQrcode = document.getElementById('wechat-qrcode');
    const closeClaimBtn = document.getElementById('close-claim-btn');
    const wheelSegments = document.getElementById('wheel-segments');

    // 应用状态
    let isSpinning = false;
    let prizes = [];
    let wechatQrcodeUrl = '';
    let totalProbability = 0;
    const API_BASE_URL = 'http://localhost:3000';

    // 初始化函数
    async function init() {
        try {
            // 获取奖品数据
            const prizesResponse = await fetch(`${API_BASE_URL}/prizes`);
            prizes = await prizesResponse.json();

            // 获取微信二维码配置
            const configResponse = await fetch(`${API_BASE_URL}/config`);
            const config = await configResponse.json();
            wechatQrcodeUrl = config.wechatQR;
            wechatQrcode.src = wechatQrcodeUrl;

            // 计算总概率
            totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);

            // 生成转盘
            generateWheel();

            // 加载抽奖记录
            loadRecords();

        } catch (error) {
            console.error('初始化失败:', error);
            alert('系统初始化失败，请刷新页面重试');
        }
    }

    // 生成转盘
    function generateWheel() {
        wheelSegments.innerHTML = '';
        const segmentCount = prizes.length;
        const anglePerSegment = 360 / segmentCount;
        const colors = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
            '#073B4C', '#EF476F', '#FF8C42', '#70D6FF', '#FF7F50'
        ];

        prizes.forEach((prize, index) => {
            const segment = document.createElement('div');
            segment.className = 'wheel-segment';
            segment.style.transform = `rotate(${index * anglePerSegment}deg)`;
            segment.style.backgroundColor = colors[index % colors.length];

            const content = document.createElement('div');
            content.className = 'wheel-segment-content';
            content.style.transform = `rotate(${anglePerSegment / 2}deg)`;
            content.innerHTML = `
                <div style="font-size: 12px; padding: 5px;">${prize.name}</div>
            `;

            segment.appendChild(content);
            wheelSegments.appendChild(segment);
        });
    }

    // 随机选择奖品（基于概率）
    function selectPrize() {
        const random = Math.random() * totalProbability;
        let cumulativeProbability = 0;

        for (const prize of prizes) {
            cumulativeProbability += prize.probability;
            if (random <= cumulativeProbability) {
                return prize;
            }
        }

        return prizes[prizes.length - 1]; // 保底返回最后一个奖品
    }

    // 旋转转盘
    async function spinWheel() {
        if (isSpinning) return;

        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.textContent = '转盘旋转中...';

        try {
            // 选择中奖奖品
            const winningPrize = selectPrize();

            // 计算旋转角度（3-5圈 + 目标位置）
            const baseRotation = 360 * (3 + Math.random() * 2);
            const segmentAngle = 360 / prizes.length;
            const prizeIndex = prizes.findIndex(prize => prize.id === winningPrize.id);
            const targetRotation = baseRotation + (360 - (prizeIndex * segmentAngle + segmentAngle / 2));

            // 应用旋转动画
            wheel.style.transform = `rotate(${targetRotation}deg)`;

            // 等待动画完成
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 显示结果弹窗
            showResultModal(winningPrize);

            // 记录抽奖结果
            await recordResult(winningPrize);

        } catch (error) {
            console.error('抽奖失败:', error);
            alert('抽奖过程中出错，请重试');
        } finally {
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.textContent = '开始抽奖';
        }
    }

    // 显示结果弹窗
    function showResultModal(prize) {
        resultImage.src = prize.imageUrl;
        resultText.textContent = prize.name;
        resultModal.classList.remove('hidden');

        // 触发动画
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    // 隐藏结果弹窗
    function hideResultModal() {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            resultModal.classList.add('hidden');
        }, 300);
    }

    // 记录抽奖结果
    async function recordResult(prize) {
        const now = new Date();
        const record = {
            prizeId: prize.id,
            prizeName: prize.name,
            prizeImage: prize.imageUrl,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };

        try {
            // 保存到本地存储
            const records = JSON.parse(localStorage.getItem('lotteryRecords') || '[]');
            records.unshift(record); // 添加到开头
            localStorage.setItem('lotteryRecords', JSON.stringify(records));

            // 更新UI
            addRecordToUI(record);

            // 通知后端记录（由后端处理地理位置）
            await fetch(`${API_BASE_URL}/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prizeId: prize.id,
                    prizeName: prize.name,
                    timestamp: record.timestamp
                })
            });

        } catch (error) {
            console.error('记录抽奖结果失败:', error);
            // 即使API调用失败，也已经保存到本地存储
        }
    }

    // 加载抽奖记录
    function loadRecords() {
        try {
            const records = JSON.parse(localStorage.getItem('lotteryRecords') || '[]');
            recordList.innerHTML = '';

            if (records.length === 0) {
                recordList.innerHTML = `
                    <div class="text-gray-500 text-center py-10 italic">
                        暂无抽奖记录
                    </div>
                `;
                return;
            }

            records.forEach(record => {
                addRecordToUI(record);
            });

        } catch (error) {
            console.error('加载抽奖记录失败:', error);
            recordList.innerHTML = `
                <div class="text-red-500 text-center py-10 italic">
                    加载记录失败
                </div>
            `;
        }
    }

    // 添加记录到UI
    function addRecordToUI(record) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.innerHTML = `
            <img src="${record.prizeImage}" alt="${record.prizeName}" class="record-icon">
            <div class="record-name">${record.prizeName}</div>
            <div class="record-time">${record.formattedTime}</div>
            <button class="claim-btn" data-name="${record.prizeName}">领取</button>
        `;
    recordList.appendChild(recordItem);
}

// 添加事件监听器
spinBtn.addEventListener('click', spinWheel);
confirmBtn.addEventListener('click', hideResultModal);
closeClaimBtn.addEventListener('click', () => {
    claimModal.classList.add('hidden');
});

// 领取按钮事件委托
recordList.addEventListener('click', (e) => {
    if (e.target.classList.contains('claim-btn')) {
        const prizeName = e.target.getAttribute('data-name');
        document.getElementById('claim-prize-name').textContent = prizeName;
        claimModal.classList.remove('hidden');
    }
});

// 初始化应用
init();