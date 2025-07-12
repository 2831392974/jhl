const jsonServer = require('json-server');
const axios = require('axios');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
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
    req.app.db.get('visitors').push(logEntry).write();
  }
  next();
});

server.use(middlewares);
server.use(router);

// 使db可用于中间件
router.db._.id = 'id';
server.use((req, res, next) => {
  req.app.db = router.db;
  next();
});

server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});