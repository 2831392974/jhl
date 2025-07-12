const jsonServer = require('json-server');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const server = jsonServer.create();
// 提供静态文件服务
server.use(jsonServer.static(__dirname));
const dbPath = path.join(__dirname, 'db.json');
const router = process.env.NODE_ENV === 'production' 
  ? jsonServer.router(JSON.parse(fs.readFileSync(dbPath, 'utf8'))) 
  : jsonServer.router(dbPath);

// 禁用默认静态文件服务，使用我们自定义的配置
const middlewares = jsonServer.defaults({ static: false });
const port = process.env.PORT || 3000;

// 添加CORS支持
server.use(async (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 添加访问日志中间件
server.use(async (req, res, next) => {
  if (req.path !== '/admin' && req.method === 'GET') {
    const now = new Date();
    // 获取IP地理定位
let longitude = null;
let latitude = null;
let address = null;

try {
  const response = await axios.get(`http://ip-api.com/json/${req.ip}`);
  if (response.data.status === 'success') {
    longitude = response.data.lon;
    latitude = response.data.lat;
    address = `${response.data.regionName}, ${response.data.city}`;
  }
} catch (error) {
  console.error('获取地理定位失败:', error);
}

const logEntry = {
  timestamp: now.toISOString(),
  type: 'visit',
  ip: req.ip,
  longitude: longitude,
  latitude: latitude,
  address: address
};

    // 将访问记录添加到数据库
    // 仅在开发环境记录访问日志到数据库
    if (process.env.NODE_ENV !== 'production') {
      req.app.db.get('visitors').push(logEntry).write();
    }
  }
  next();
});

// 全局错误处理中间件
server.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

server.use(middlewares);

// 处理SPA路由，所有非API请求返回index.html
server.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

server.use(router);

// 使db可用于中间件
router.db._.id = 'id';
server.use((req, res, next) => {
  req.app.db = router.db;
  next();
});

module.exports = server;

// 本地开发时启动服务器
if (process.env.NODE_ENV !== 'production') {
  server.listen(port, () => {
    console.log(`JSON Server is running on port ${port}`);
  });
}
