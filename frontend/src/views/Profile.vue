<template>
  <div class="profile-container">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <h3>个人信息</h3>
              <el-button
                type="primary"
                text
                @click="editMode = !editMode"
              >
                {{ editMode ? '取消' : '编辑' }}
              </el-button>
            </div>
          </template>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
          >
            <el-form-item label="用户名">
              <el-input
                v-model="form.username"
                :disabled="true"
              />
            </el-form-item>

            <el-form-item
              label="昵称"
              prop="nickname"
            >
              <el-input
                v-model="form.nickname"
                :disabled="!editMode"
              />
            </el-form-item>

            <el-form-item
              label="手机号"
              prop="phone"
            >
              <el-input
                v-model="form.phone"
                :disabled="!editMode"
              />
            </el-form-item>

            <el-form-item v-if="editMode">
              <el-button
                type="primary"
                @click="handleSave"
                :loading="loading"
              >
                保存
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <h3>骑行统计</h3>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ stats.totalRides }}</div>
                <div class="stat-label">总骑行次数</div>
              </div>
            </el-col>

            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ formatDistance(stats.totalDistance) }}</div>
                <div class="stat-label">总骑行距离</div>
              </div>
            </el-col>

            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ formatDuration(stats.totalDuration) }}</div>
                <div class="stat-label">总骑行时长</div>
              </div>
            </el-col>
          </el-row>

          <div class="chart-container">
            <h4>最近7天骑行记录</h4>
            <!-- 这里可以添加图表组件 -->
          </div>
        </el-card>

        <el-card class="preferences-card">
          <template #header>
            <div class="card-header">
              <h3>偏好设置</h3>
            </div>
          </template>

          <el-form label-position="left" label-width="120px">
            <el-form-item label="默认搜索范围">
              <el-input-number
                v-model="preferences.searchRadius"
                :min="100"
                :max="2000"
                :step="100"
              >
                <template #append>米</template>
              </el-input-number>
            </el-form-item>

            <el-form-item label="消息通知">
              <el-switch
                v-model="preferences.notifications"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>

            <el-form-item label="自动结算">
              <el-switch
                v-model="preferences.autoCheckout"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'

const store = useStore()
const formRef = ref(null)
const loading = ref(false)
const editMode = ref(false)

// 表单数据
const form = reactive({
  username: 'user123',
  nickname: '骑行达人',
  phone: '13800138000'
})

// 表单验证规则
const rules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

// 骑行统计
const stats = reactive({
  totalRides: 42,
  totalDistance: 125000, // 米
  totalDuration: 360000000 // 毫秒
})

// 偏好设置
const preferences = reactive({
  searchRadius: 500,
  notifications: true,
  autoCheckout: false
})

// 保存个人信息
const handleSave = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('保存成功')
    editMode.value = false
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 工具函数
const formatDistance = (meters) => {
  return meters < 1000
    ? `${meters.toFixed(0)}米`
    : `${(meters / 1000).toFixed(1)}公里`
}

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  return `${hours}小时${minutes % 60}分钟`
}
</script>

<style scoped>
.profile-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 40px);
}

.profile-card,
.stats-card,
.preferences-card {
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
  color: #303133;
}

.stat-item {
  text-align: center;
  padding: 24px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input-number) {
  width: 180px;
}

:deep(.el-switch) {
  margin-top: 8px;
}

.el-row {
  margin-bottom: 20px;
}

.el-col {
  margin-bottom: 20px;
}

@media (min-width: 768px) {
  .el-col {
    margin-bottom: 0;
  }
}
</style> 