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

          <div v-if="selectedBike" class="selected-bike-info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="单车编号">
                {{ selectedBike.id }}
              </el-descriptions-item>
              <el-descriptions-item label="距离">
                {{ formatDistance(selectedBike.distance) }}
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="isInRange ? 'success' : 'warning'">
                  {{ isInRange ? '可开锁' : '距离过远' }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
            
            <div class="bike-actions">
              <el-button
                type="primary"
                @click="startNavigation"
                :disabled="!userLocation"
                class="action-btn"
              >
                导航到单车
              </el-button>
              <el-button
                type="success"
                @click="handleStartRide"
                :disabled="!isInRange"
                class="action-btn"
              >
                开锁使用
              </el-button>
              <el-button
                type="warning"
                @click="moveToBike"
                class="action-btn"
              >
                移动到单车位置
              </el-button>
            </div>
          </div>

          <div v-else-if="nearbyBikes.length" class="bikes-list">
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
                    @click="selectBike(row)"
                    :disabled="!!currentRide"
                  >
                    选择
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
        @click="handleMapClick"
        ref="mapRef"
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
                @click="selectBike(bike)"
                :disabled="!!currentRide"
              >
                选择此车
              </el-button>
            </div>
          </l-popup>
        </l-marker>

        <l-polyline
          v-if="navigationPath"
          :lat-lngs="navigationPath"
          color="#409EFF"
          :weight="3"
          :opacity="0.8"
        />

        <l-circle
          v-if="selectedBike"
          :lat-lng="selectedBike.location"
          :radius="1"
          color="#4CAF50"
          fill-color="#4CAF50"
          fill-opacity="0.2"
        />

        <l-polyline
          v-if="currentRide?.path"
          :lat-lngs="currentRide.path"
          color="blue"
          :weight="3"
        />

        <l-control position="topright">
          <div class="map-controls">
            <el-button
              type="primary"
              icon="Aim"
              @click="locateUser"
              circle
            />
            <el-button
              type="success"
              icon="Edit"
              @click="toggleCustomLocation"
              circle
            />
          </div>
        </l-control>
      </l-map>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup,
  LPolyline,
  LControl
} from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'
import { ArrowLeft, ArrowRight, Aim, Edit } from '@element-plus/icons-vue'
import axios from 'axios'

// 状态
const store = useStore()
const loading = ref(false)
const sidebarCollapsed = ref(false)
const mapRef = ref(null)
const map = ref(null)
const searchRadius = ref(500)
const zoom = ref(13)
const userLocation = ref(null)
const nearbyBikes = ref([])
const currentRide = ref(null)
const watchId = ref(null)
const selectedBike = ref(null)
const navigationPath = ref(null)
const isInRange = ref(true)
const isCustomLocationMode = ref(false)

// 地图中心（武汉市中心）
const mapCenter = ref([30.5928, 114.3055])

// 自定义图标
const userIcon = L.divIcon({
  html: `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="8" fill="#409EFF" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="4" fill="white"/>
    </svg>
  `,
  className: 'custom-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

const bikeIcon = L.divIcon({
  html: `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 16C8 11.5817 11.5817 8 16 8C20.4183 8 24 11.5817 24 16C24 20.4183 20.4183 24 16 24C11.5817 24 8 20.4183 8 16Z" fill="#4CAF50" stroke="white" stroke-width="2"/>
      <path d="M16 8V16M16 16V24M8 16H16M16 16H24" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <circle cx="16" cy="16" r="2" fill="white"/>
    </svg>
  `,
  className: 'custom-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api'
})

// 添加请求拦截器
api.interceptors.request.use(config => {
  const token = store.state.auth.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 方法
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const handleMapReady = (mapInstance) => {
  if (mapInstance) {
    map.value = mapInstance
    // 确保地图实例完全初始化后再定位
    nextTick(() => {
      if (map.value) {
        locateUser()
      }
    })
  }
}

const locateUser = () => {
  // 如果正在使用自定义位置模式，不执行自动定位
  if (isCustomLocationMode.value) {
    ElMessage.info('当前处于自定义位置模式，请在地图上点击选择位置')
    return
  }

  // 如果已经有自定义位置，询问是否要使用自动定位
  if (userLocation.value && !isCustomLocationMode.value) {
    ElMessageBox.confirm(
      '是否要使用自动定位？这将覆盖您当前的位置。',
      '位置切换',
      {
        confirmButtonText: '使用自动定位',
        cancelButtonText: '保持当前位置',
        type: 'warning'
      }
    ).then(() => {
      startAutoLocation()
    }).catch(() => {
      ElMessage.info('已保持当前位置')
    })
    return
  }

  startAutoLocation()
}

// 添加自动定位函数
const startAutoLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('您的浏览器不支持地理定位')
    setDefaultLocation()
    return
  }

  // 确保地图实例存在
  if (!map.value) {
    ElMessage.warning('地图正在加载中，请稍后再试')
    return
  }

  // 设置超时处理
  const timeoutId = setTimeout(() => {
    ElMessage.warning('获取位置超时，使用默认位置')
    setDefaultLocation()
  }, 10000)

  // 定位到用户位置
  navigator.geolocation.getCurrentPosition(
    (position) => {
      clearTimeout(timeoutId)
      const { latitude, longitude } = position.coords
      userLocation.value = [latitude, longitude]
      mapCenter.value = [latitude, longitude]
      zoom.value = 15
      try {
        map.value.setView([latitude, longitude], 15)
      } catch (error) {
        console.error('设置地图视图失败:', error)
        setDefaultLocation()
      }
      ElMessage.success('已获取您的位置')
    },
    (error) => {
      clearTimeout(timeoutId)
      console.error('Geolocation error:', error)
      let errorMessage = '无法获取您的位置'
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = '请允许浏览器获取位置信息'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = '位置信息不可用'
          break
        case error.TIMEOUT:
          errorMessage = '获取位置超时'
          break
        default:
          errorMessage = '获取位置时发生错误'
      }
      
      ElMessage.error(errorMessage)
      setDefaultLocation()
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

const startLocationTracking = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('您的浏览器不支持地理定位')
    return
  }

  watchId.value = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      userLocation.value = [latitude, longitude]
      
      if (currentRide.value) {
        currentRide.value.path.push([latitude, longitude])
        updateRideStats()
      } else if (selectedBike.value) {
        await checkRange()
      }
    },
    (error) => {
      console.error('Location tracking error:', error)
      isInRange.value = false
      let errorMessage = '位置追踪失败'
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = '请允许浏览器获取位置信息'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = '位置信息不可用'
          break
        case error.TIMEOUT:
          errorMessage = '获取位置超时'
          break
        default:
          errorMessage = '位置追踪时发生错误'
      }
      
      ElMessage.error(errorMessage)
      // 如果位置追踪失败，使用默认位置
      setDefaultLocation()
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
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
    const response = await api.post('/bikes/nearby', {
      location: userLocation.value,
      radius: searchRadius.value || 500
    })
    nearbyBikes.value = response.data
  } catch (error) {
    ElMessage.error('获取附近单车失败')
  } finally {
    loading.value = false
  }
}

const selectBike = async (bike) => {
  selectedBike.value = bike
  await calculatePath()
  await checkRange()
}

const calculatePath = async () => {
  if (!userLocation.value || !selectedBike.value) return

  try {
    const response = await api.post('/analyze-path', {
      startLocation: userLocation.value,
      endLocation: selectedBike.value.location
    })
    navigationPath.value = response.data.path
    
    // 调整地图视图以显示整个路线
    if (navigationPath.value && navigationPath.value.length > 0) {
      const bounds = L.latLngBounds(navigationPath.value)
      map.value?.fitBounds(bounds, { padding: [50, 50] })
    }
  } catch (error) {
    ElMessage.error('路径计算失败')
  }
}

const checkRange = async () => {
  if (!userLocation.value || !selectedBike.value) return

  try {
    const response = await api.post('/check-range', {
      userLocation: userLocation.value,
      bikeLocation: selectedBike.value.location
    })
    isInRange.value = response.data.inRange && response.data.distance <= 1
  } catch (error) {
    ElMessage.error('距离检查失败')
    isInRange.value = false
  }
}

const startNavigation = async () => {
  if (!selectedBike.value) return
  
  // 设置地图视图到单车位置
  map.value?.setView(selectedBike.value.location, 15)
  
  // 计算并显示导航路线
  try {
    const response = await api.post('/analyze-path', {
      startLocation: userLocation.value,
      endLocation: selectedBike.value.location
    })
    navigationPath.value = response.data.path
    
    // 调整地图视图以显示整个路线
    if (navigationPath.value && navigationPath.value.length > 0) {
      const bounds = L.latLngBounds(navigationPath.value)
      map.value?.fitBounds(bounds, { padding: [50, 50] })
    }
  } catch (error) {
    ElMessage.error('路线计算失败')
  }
}

const handleStartRide = async () => {
  if (!selectedBike.value || !isInRange.value) {
    ElMessage.error('您不在单车附近，请靠近后再试')
    return
  }

  try {
    loading.value = true
    
    // 最后一次距离检查
    const response = await api.post('/check-range', {
      userLocation: userLocation.value,
      bikeLocation: selectedBike.value.location
    })
    
    if (!response.data.inRange || response.data.distance > 1) {
      ElMessage.error(`您距离单车还有 ${Math.round(response.data.distance)} 米，请靠近后再试`)
      return
    }

    // 调用后端 API 开始骑行
    const startResponse = await api.post('/start-ride', {
      bikeId: selectedBike.value.id,
      userLocation: userLocation.value,
      bikeLocation: selectedBike.value.location
    })
    
    // 如果后端验证通过，才开始骑行
    currentRide.value = {
      bikeId: selectedBike.value.id,
      startTime: Date.now(),
      startLocation: selectedBike.value.location,
      path: [selectedBike.value.location],
      duration: 0,
      distance: 0,
      price: 0
    }
    
    selectedBike.value = null
    navigationPath.value = null
    startLocationTracking()
    ElMessage.success('开始骑行')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '开始骑行失败')
  } finally {
    loading.value = false
  }
}

const handleEndRide = async () => {
  try {
    loading.value = true
    
    // 调用后端 API 结束骑行
    const endResponse = await api.post('/end-ride', {
      bikeId: currentRide.value.bikeId,
      endLocation: userLocation.value
    })
    
    stopLocationTracking()
    currentRide.value = null
    ElMessage.success('骑行结束')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '结束骑行失败')
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

const toggleCustomLocation = () => {
  isCustomLocationMode.value = !isCustomLocationMode.value
  if (isCustomLocationMode.value) {
    ElMessage.info('请在地图上点击选择位置')
  } else {
    ElMessage.info('已退出自定义位置模式')
  }
}

const handleMapClick = (event) => {
  if (!isCustomLocationMode.value) return
  
  const { lat, lng } = event.latlng
  userLocation.value = [lat, lng]
  mapCenter.value = [lat, lng]
  isCustomLocationMode.value = false
  ElMessage.success('已设置自定义位置')
  
  // 如果有选中的单车，重新计算路径和距离
  if (selectedBike.value) {
    calculatePath()
    checkRange()
  }
}

// 添加设置默认位置的函数
const setDefaultLocation = () => {
  // 使用武汉市中心作为默认位置
  const defaultLocation = [30.5928, 114.3055]
  userLocation.value = defaultLocation
  mapCenter.value = defaultLocation
  zoom.value = 13
  
  try {
    if (map.value) {
      map.value.setView(defaultLocation, 13)
    }
  } catch (error) {
    console.error('设置默认位置失败:', error)
  }
  
  ElMessage.info('已使用默认位置（武汉市中心）')
}

const moveToBike = () => {
  if (!selectedBike.value) return
  
  // 更新用户位置到单车位置
  userLocation.value = selectedBike.value.location
  mapCenter.value = selectedBike.value.location
  
  // 更新地图视图
  try {
    map.value?.setView(selectedBike.value.location, 15)
  } catch (error) {
    console.error('设置地图视图失败:', error)
  }
  
  // 重新检查距离
  checkRange()
  ElMessage.success('已移动到单车位置')
}

// 生命周期
onMounted(() => {
  // 初始化时不自动定位，等待用户选择定位方式
  setDefaultLocation()
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

.selected-bike-info {
  margin-top: 16px;
}

.bike-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  width: 100%;
}

.map-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style> 