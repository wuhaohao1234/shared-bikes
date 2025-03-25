<template>
  <div class="ride-history-container">
    <el-card class="ride-history-card">
      <template #header>
        <div class="card-header">
          <h3>骑行历史</h3>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="rides"
        style="width: 100%"
      >
        <el-table-column
          prop="id"
          label="骑行编号"
          width="120"
        />
        
        <el-table-column
          prop="startTime"
          label="开始时间"
          width="180"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template>
        </el-table-column>
        
        <el-table-column
          prop="duration"
          label="骑行时长"
        >
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        
        <el-table-column
          prop="distance"
          label="骑行距离"
        >
          <template #default="{ row }">
            {{ formatDistance(row.distance) }}
          </template>
        </el-table-column>
        
        <el-table-column
          prop="price"
          label="费用"
        >
          <template #default="{ row }">
            {{ formatPrice(row.price) }}
          </template>
        </el-table-column>
        
        <el-table-column
          label="操作"
          width="120"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="showRideDetails(row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="handlePageChange"
        class="pagination"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      title="骑行详情"
      width="80%"
    >
      <div v-if="selectedRide" class="ride-details">
        <div class="map-container">
          <l-map
            :zoom="13"
            :center="getPathCenter(selectedRide.path)"
          >
            <l-tile-layer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="OpenStreetMap"
            />
            
            <l-marker
              :lat-lng="selectedRide.path[0]"
              :icon="startIcon"
            >
              <l-popup>起点</l-popup>
            </l-marker>
            
            <l-marker
              :lat-lng="selectedRide.path[selectedRide.path.length - 1]"
              :icon="endIcon"
            >
              <l-popup>终点</l-popup>
            </l-marker>
            
            <l-polyline
              :lat-lngs="selectedRide.path"
              color="blue"
              :weight="3"
            />
          </l-map>
        </div>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="骑行编号">
            {{ selectedRide.id }}
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ formatDateTime(selectedRide.startTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="结束时间">
            {{ formatDateTime(selectedRide.endTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="骑行时长">
            {{ formatDuration(selectedRide.duration) }}
          </el-descriptions-item>
          <el-descriptions-item label="骑行距离">
            {{ formatDistance(selectedRide.distance) }}
          </el-descriptions-item>
          <el-descriptions-item label="费用">
            {{ formatPrice(selectedRide.price) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup,
  LPolyline
} from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'

const store = useStore()
const loading = ref(false)
const rides = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const selectedRide = ref(null)

// 自定义图标
const startIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#4CAF50" stroke="white" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">起</text>
    </svg>
  `,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

const endIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#F44336" stroke="white" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">终</text>
    </svg>
  `,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

// 加载骑行历史
const loadRides = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    rides.value = generateMockRides()
    total.value = rides.value.length
  } catch (error) {
    ElMessage.error('获取骑行历史失败')
  } finally {
    loading.value = false
  }
}

// 显示骑行详情
const showRideDetails = (ride) => {
  selectedRide.value = ride
  dialogVisible.value = true
}

// 处理分页
const handlePageChange = (page) => {
  currentPage.value = page
  loadRides()
}

// 工具函数
const formatDateTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours > 0
    ? `${hours}小时${remainingMinutes}分钟`
    : `${minutes}分钟`
}

const formatDistance = (meters) => {
  return meters < 1000
    ? `${meters.toFixed(0)}米`
    : `${(meters / 1000).toFixed(1)}公里`
}

const formatPrice = (price) => {
  return `¥${price.toFixed(2)}`
}

const getPathCenter = (path) => {
  if (!path || path.length === 0) {
    return [30.5928, 114.3055] // 武汉市中心
  }
  
  const bounds = L.latLngBounds(path)
  return bounds.getCenter()
}

// 生成模拟数据
const generateMockRides = () => {
  const rides = []
  const now = Date.now()
  
  for (let i = 0; i < 20; i++) {
    const startTime = now - Math.random() * 7 * 24 * 60 * 60 * 1000
    const duration = Math.random() * 60 * 60 * 1000
    const distance = Math.random() * 5000
    
    rides.push({
      id: `R${String(i + 1).padStart(3, '0')}`,
      startTime,
      endTime: startTime + duration,
      duration,
      distance,
      price: Math.max(1, Math.ceil(duration / 900000)), // 15分钟1元
      path: generateMockPath()
    })
  }
  
  return rides.sort((a, b) => b.startTime - a.startTime)
}

const generateMockPath = () => {
  const center = [30.5928, 114.3055]
  const points = []
  const numPoints = Math.floor(Math.random() * 10) + 2
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / (numPoints - 1)) * Math.PI * 2
    const radius = Math.random() * 0.01
    points.push([
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius
    ])
  }
  
  return points
}

onMounted(() => {
  loadRides()
})
</script>

<style scoped>
.ride-history-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 40px);
}

.ride-history-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
}

.map-container {
  height: 400px;
  margin-bottom: 20px;
}

:deep(.el-table) {
  margin-top: 20px;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
}

:deep(.el-pagination) {
  margin-top: 20px;
  text-align: right;
}

.ride-details {
  padding: 20px;
}

:deep(.el-descriptions) {
  margin-top: 20px;
}

:deep(.el-descriptions__title) {
  font-size: 16px;
}

:deep(.el-descriptions__label) {
  width: 120px;
}
</style> 