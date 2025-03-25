<template>
  <div class="map-container">
    <div class="map-sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <el-button
        class="collapse-btn"
        :icon="sidebarCollapsed ? 'ArrowRight' : 'ArrowLeft'"
        @click="toggleSidebar"
        circle
      />
      
      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <el-card v-if="currentRide" class="info-card">
          <template #header>
            <div class="card-header">
              <span>当前骑行</span>
            </div>
          </template>
          
          <div class="ride-info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="骑行时长">
                {{ formatDuration(currentRide.duration) }}
              </el-descriptions-item>
              <el-descriptions-item label="骑行距离">
                {{ formatDistance(currentRide.distance) }}
              </el-descriptions-item>
              <el-descriptions-item label="当前费用">
                {{ formatPrice(currentRide.price) }}
              </el-descriptions-item>
            </el-descriptions>
            
            <el-button
              type="danger"
              @click="handleEndRide"
              :loading="loading"
              class="end-ride-btn"
            >
              结束骑行
            </el-button>
          </div>
        </el-card>

        <el-card v-else class="info-card">
          <template #header>
            <div class="card-header">
              <span>查找单车</span>
            </div>
          </template>
          
          <div class="search-controls">
            <el-input
              v-model="searchRadius"
              type="number"
              placeholder="搜索范围（米）"
              class="radius-input"
            >
              <template #append>米</template>
            </el-input>
            
            <el-button
              type="primary"
              @click="findNearbyBikes"
              :loading="loading"
              class="search-btn"
            >
              查找附近单车
            </el-button>
          </div>

          <div v-if="nearbyBikes.length" class="bikes-list">
            <el-table :data="nearbyBikes" style="width: 100%">
              <el-table-column prop="id" label="编号" width="80" />
              <el-table-column prop="distance" label="距离">
                <template #default="{ row }">
                  {{ formatDistance(row.distance) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    size="small"
                    @click="handleStartRide(row)"
                    :disabled="!!currentRide"
                  >
                    租用
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </div>
    </div>

    <div class="map-content">
      <l-map
        v-model="zoom"
        :zoom="zoom"
        :center="mapCenter"
        :options="{ zoomControl: false }"
        @ready="handleMapReady"
      >
        <l-tile-layer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          layer-type="base"
          name="OpenStreetMap"
        />
        
        <l-marker
          v-if="userLocation"
          :lat-lng="userLocation"
          :icon="userIcon"
        >
          <l-popup>您的位置</l-popup>
        </l-marker>

        <l-marker
          v-for="bike in nearbyBikes"
          :key="bike.id"
          :lat-lng="bike.location"
          :icon="bikeIcon"
        >
          <l-popup>
            <div class="bike-popup">
              <p>单车编号: {{ bike.id }}</p>
              <p>距离: {{ formatDistance(bike.distance) }}</p>
              <el-button
                type="primary"
                size="small"
                @click="handleStartRide(bike)"
                :disabled="!!currentRide"
              >
                租用此车
              </el-button>
            </div>
          </l-popup>
        </l-marker>

        <l-polyline
          v-if="currentRide?.path"
          :lat-lngs="currentRide.path"
          color="blue"
          :weight="3"
        />

        <l-control position="topright">
          <el-button
            type="primary"
            icon="Aim"
            @click="locateUser"
            circle
          />
        </l-control>
      </l-map>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup,
  LPolyline,
  LControl
} from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'
import { ArrowLeft, ArrowRight, Aim } from '@element-plus/icons-vue'

// 状态
const store = useStore()
const loading = ref(false)
const sidebarCollapsed = ref(false)
const map = ref(null)
const searchRadius = ref(500)
const zoom = ref(13)
const userLocation = ref(null)
const nearbyBikes = ref([])
const currentRide = ref(null)
const watchId = ref(null)

// 地图中心（武汉市中心）
const mapCenter = ref([30.5928, 114.3055])

// 自定义图标
const userIcon = L.icon({
  iconUrl: '/icons/user-location.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

const bikeIcon = L.icon({
  iconUrl: '/icons/bike.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

// 方法
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const handleMapReady = (mapInstance) => {
  map.value = mapInstance
  locateUser()
}

const locateUser = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('您的浏览器不支持地理定位')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      userLocation.value = [latitude, longitude]
      mapCenter.value = [latitude, longitude]
      zoom.value = 15
    },
    (error) => {
      ElMessage.error('无法获取您的位置')
      console.error('Geolocation error:', error)
    }
  )
}

const startLocationTracking = () => {
  if (!navigator.geolocation) return

  watchId.value = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      userLocation.value = [latitude, longitude]
      
      if (currentRide.value) {
        currentRide.value.path.push([latitude, longitude])
        updateRideStats()
      }
    },
    (error) => {
      console.error('Location tracking error:', error)
    }
  )
}

const stopLocationTracking = () => {
  if (watchId.value) {
    navigator.geolocation.clearWatch(watchId.value)
    watchId.value = null
  }
}

const findNearbyBikes = async () => {
  if (!userLocation.value) {
    ElMessage.warning('请先允许获取位置信息')
    return
  }

  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    nearbyBikes.value = generateMockBikes()
    ElMessage.success('已找到附近的单车')
  } catch (error) {
    ElMessage.error('获取附近单车失败')
  } finally {
    loading.value = false
  }
}

const handleStartRide = async (bike) => {
  try {
    loading.value = true
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    currentRide.value = {
      bikeId: bike.id,
      startTime: Date.now(),
      startLocation: bike.location,
      path: [bike.location],
      duration: 0,
      distance: 0,
      price: 0
    }
    
    startLocationTracking()
    ElMessage.success('开始骑行')
  } catch (error) {
    ElMessage.error('开始骑行失败')
  } finally {
    loading.value = false
  }
}

const handleEndRide = async () => {
  try {
    loading.value = true
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    stopLocationTracking()
    currentRide.value = null
    ElMessage.success('骑行结束')
  } catch (error) {
    ElMessage.error('结束骑行失败')
  } finally {
    loading.value = false
  }
}

const updateRideStats = () => {
  if (!currentRide.value) return
  
  const now = Date.now()
  currentRide.value.duration = now - currentRide.value.startTime
  currentRide.value.distance = calculatePathDistance(currentRide.value.path)
  currentRide.value.price = calculatePrice(currentRide.value.duration)
}

// 工具函数
const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}分${seconds}秒`
}

const formatDistance = (meters) => {
  return meters < 1000
    ? `${meters.toFixed(0)}米`
    : `${(meters / 1000).toFixed(1)}公里`
}

const formatPrice = (price) => {
  return `¥${price.toFixed(2)}`
}

const calculatePathDistance = (path) => {
  if (path.length < 2) return 0
  
  let distance = 0
  for (let i = 1; i < path.length; i++) {
    const point1 = L.latLng(path[i - 1])
    const point2 = L.latLng(path[i])
    distance += point1.distanceTo(point2)
  }
  
  return distance
}

const calculatePrice = (duration) => {
  const minutes = duration / 60000
  return Math.max(1, Math.ceil(minutes / 15))
}

const generateMockBikes = () => {
  if (!userLocation.value) return []
  
  const [lat, lng] = userLocation.value
  const bikes = []
  
  for (let i = 0; i < 5; i++) {
    const distance = Math.random() * searchRadius.value
    const angle = Math.random() * Math.PI * 2
    const dlat = distance * Math.cos(angle) / 111320
    const dlng = distance * Math.sin(angle) / (111320 * Math.cos(lat * Math.PI / 180))
    
    bikes.push({
      id: `B${String(i + 1).padStart(3, '0')}`,
      location: [lat + dlat, lng + dlng],
      distance
    })
  }
  
  return bikes.sort((a, b) => a.distance - b.distance)
}

// 生命周期
onMounted(() => {
  locateUser()
})

onUnmounted(() => {
  stopLocationTracking()
})
</script>

<style scoped>
.map-container {
  height: calc(100vh - 40px);
  position: relative;
}

.map-content {
  height: 100%;
  width: 100%;
}

.map-sidebar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 300px;
}

.bike-popup {
  padding: 10px;
}

.bike-popup p {
  margin: 5px 0;
}

.bike-popup .el-button {
  margin-top: 10px;
  width: 100%;
}

:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  z-index: 1;
}

:deep(.el-card) {
  margin-bottom: 16px;
}

.collapse-btn {
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1001;
}

.sidebar-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.info-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.radius-input {
  width: 100%;
}

.search-btn {
  width: 100%;
}

.bikes-list {
  margin-top: 16px;
}

.end-ride-btn {
  width: 100%;
}
</style> 