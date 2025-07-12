# 幸运大转盘抽奖系统

## 项目说明
这是一个完整的幸运大转盘抽奖系统，包含前端抽奖页面、后台数据收集和管理后台。

## 功能特点
- 美观的转盘抽奖界面，支持5种奖品
- 抽奖概率可配置
- 自动记录抽奖历史
- 后台自动获取访问者IP和地理位置
- 管理员后台查看访问数据和修改奖品信息

## 文件结构
```
抽奖/
├── README.md           - 项目说明文档
├── admin.css           - 管理后台样式
├── admin.html          - 管理后台页面
├── admin.js            - 管理后台脚本
├── db.json             - 数据库文件，存储奖品和访问记录
├── index.html          - 抽奖页面
├── package.json        - 项目依赖
├── script.js           - 抽奖功能脚本
├── server.js           - 后端服务器
├── style.css           - 抽奖页面样式
└── wechat-qrcode.png   - 微信客服二维码
```

## 安装步骤
1. 安装Node.js: 访问 https://nodejs.org/ 下载并安装
2. 下载本项目到本地
3. 打开命令提示符，进入项目文件夹
4. 运行 `npm install` 安装依赖
5. 运行 `npm start` 启动服务器
6. 打开浏览器访问 http://localhost:3000 即可使用抽奖页面
7. 访问 http://localhost:3000/admin 进入管理后台（账号: admin, 密码: admin）

## 修改奖品信息
1. 直接编辑db.json文件中的prizes数组
2. 每个奖品包含id、name、imageUrl和probability字段
3. probability字段控制中奖概率，总和建议为100
4. 修改后保存文件，系统会自动生效

## 修改微信客服二维码
1. 替换wechat-qrcode.png文件，保持文件名不变
2. 或修改db.json中config.wechatQR的值为新的图片URL

## 查看数据
访问管理后台可以查看访问记录和抽奖统计数据

## 注意事项
- 确保服务器一直运行以收集数据
- 不要删除或重命名文件，以免系统出错
- 修改配置后建议重启服务器