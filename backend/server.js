const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replacing database)
const users = [{
  username: 'user123',
  // This is a hashed version of 'password123'
  password: '$2b$10$nfbYfgItaEUBbQ5mb1VwM.zpPHZY3PtdEy1p7Sah9reOnwYfdWcKG'
}];

// 初始化单车数据
const bikes = [
  {
    id: 'B001',
    location: [30.5928, 114.3055],
    status: 'available',
    currentRideId: null
  },
  {
    id: 'B002',
    location: [30.5828, 114.3155],
    status: 'available',
    currentRideId: null
  },
  {
    id: 'B003',
    location: [30.6028, 114.2955],
    status: 'available',
    currentRideId: null
  },
  {
    id: 'B004',
    location: [30.5728, 114.3255],
    status: 'available',
    currentRideId: null
  },
  {
    id: 'B005',
    location: [30.6128, 114.2855],
    status: 'available',
    currentRideId: null
  }
];

const parkingSpots = [];
const rides = []; // 添加骑行记录数组

// JWT Secret
const JWT_SECRET = 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: 'Invalid password' });
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET);
  res.json({ token });
});

// Protected routes
app.get('/api/bikes', authenticateToken, (req, res) => {
  res.json(bikes);
});

app.get('/api/parking-spots', authenticateToken, (req, res) => {
  res.json(parkingSpots);
});

// 开始骑行
app.post('/api/start-ride', (req, res) => {
  const { bikeId, userLocation, bikeLocation } = req.body
  
  // 查找单车
  const bike = bikes.find(b => b.id === bikeId)
  if (!bike) {
    return res.status(404).json({ message: '单车不存在' })
  }

  // 检查单车状态
  if (bike.status !== 'available') {
    return res.status(400).json({ message: '该单车当前不可用' })
  }

  // 计算距离
  const distance = calculateDistance(userLocation, bikeLocation)
  if (distance > 1) {
    return res.status(400).json({ message: `您距离单车还有 ${Math.round(distance)} 米，请靠近后再试` })
  }

  // 开始骑行
  const rideId = Date.now().toString()
  bike.status = 'in_use'
  bike.currentRideId = rideId

  // 创建骑行记录
  const ride = {
    id: rideId,
    bikeId,
    startTime: Date.now(),
    startLocation: bikeLocation,
    status: 'active'
  }
  rides.push(ride)

  res.json({ message: '开始骑行成功', rideId })
})

// 结束骑行
app.post('/api/end-ride', (req, res) => {
  const { bikeId, endLocation } = req.body
  
  // 查找单车
  const bike = bikes.find(b => b.id === bikeId)
  if (!bike) {
    return res.status(404).json({ message: '单车不存在' })
  }

  // 查找骑行记录
  const ride = rides.find(r => r.bikeId === bikeId && r.status === 'active')
  if (!ride) {
    return res.status(400).json({ message: '未找到进行中的骑行记录' })
  }

  // 计算骑行时长和距离
  const duration = Date.now() - ride.startTime
  const distance = calculateDistance(ride.startLocation, endLocation)

  // 更新骑行记录
  ride.endTime = Date.now()
  ride.endLocation = endLocation
  ride.duration = duration
  ride.distance = distance
  ride.status = 'completed'

  // 更新单车状态
  bike.status = 'available'
  bike.currentRideId = null
  bike.location = endLocation // 更新单车位置到结束位置

  res.json({ message: '结束骑行成功', ride })
})

// 路径分析接口
app.post('/api/analyze-path', authenticateToken, async (req, res) => {
  const { startLocation, endLocation } = req.body;
  
  try {
    // 生成一条平滑的路径，包含多个中间点
    const path = generateSmoothPath(startLocation, endLocation);
    res.json({ path });
  } catch (error) {
    res.status(500).json({ message: '路径分析失败' });
  }
});

// 检查是否在合理范围内
app.post('/api/check-range', authenticateToken, (req, res) => {
  const { userLocation, bikeLocation } = req.body;
  
  const distance = calculateDistance(userLocation, bikeLocation);
  const isInRange = distance <= 1; // 1米范围内允许开锁

  res.json({ 
    inRange: isInRange,
    distance: distance
  });
});

// 获取附近的单车
app.post('/api/bikes/nearby', authenticateToken, (req, res) => {
  const { location, radius } = req.body;
  
  // 模拟数据：生成一些随机位置的单车
  const mockBikes = Array.from({ length: 5 }, (_, index) => {
    const lat = location[0] + (Math.random() - 0.5) * 0.01;
    const lng = location[1] + (Math.random() - 0.5) * 0.01;
    const distance = calculateDistance(location, [lat, lng]);
    
    return {
      id: `B${String(index + 1).padStart(3, '0')}`,
      location: [lat, lng],
      status: 'available',
      distance: distance
    };
  });

  // 按距离排序
  mockBikes.sort((a, b) => a.distance - b.distance);
  
  res.json(mockBikes);
});

// 工具函数：计算两点之间的距离（米）
function calculateDistance(point1, point2) {
  const R = 6371e3; // 地球半径（米）
  const φ1 = (point1[0] * Math.PI) / 180;
  const φ2 = (point2[0] * Math.PI) / 180;
  const Δφ = ((point2[0] - point1[0]) * Math.PI) / 180;
  const Δλ = ((point2[1] - point1[1]) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 工具函数：生成平滑路径
function generateSmoothPath(start, end) {
  const path = [];
  const steps = 20; // 增加路径点数量，使路线更平滑
  const latDiff = end[0] - start[0];
  const lngDiff = end[1] - start[1];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // 使用贝塞尔曲线生成平滑路径
    const lat = start[0] + latDiff * t;
    const lng = start[1] + lngDiff * t;
    path.push([lat, lng]);
  }

  return path;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 