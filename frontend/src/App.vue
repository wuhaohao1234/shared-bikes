<template>
  <el-container class="app-container">
    <el-aside v-if="isLoggedIn" width="200px" class="sidebar">
      <div class="logo">
        <h2>共享单车</h2>
      </div>
      <el-menu
        :default-active="activeRoute"
        class="el-menu-vertical"
        :router="true"
        background-color="#304156"
        text-color="#fff"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/map">
          <el-icon><Location /></el-icon>
          <span>地图</span>
        </el-menu-item>
        <el-menu-item index="/rides">
          <el-icon><Bicycle /></el-icon>
          <span>骑行记录</span>
        </el-menu-item>
        <el-menu-item index="/profile">
          <el-icon><User /></el-icon>
          <span>个人中心</span>
        </el-menu-item>
      </el-menu>
      <div class="logout-button">
        <el-button type="text" @click="handleLogout" class="logout-item">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </el-button>
      </div>
    </el-aside>

    <el-container class="main-container">
      <el-main>
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { Location, Bicycle, User, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const store = useStore()
const router = useRouter()
const route = useRoute()

const isLoggedIn = computed(() => store.state.auth.isLoggedIn)
const activeRoute = computed(() => route.path)

const handleLogout = async () => {
  try {
    await store.dispatch('auth/logout')
    ElMessage.success('退出登录成功')
    router.push('/login')
  } catch (error) {
    ElMessage.error('退出登录失败')
  }
}
</script>

<style>
.app-container {
  min-height: 100vh;
}

.sidebar {
  background-color: #304156;
  color: #fff;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
}

.main-container {
  min-height: 100vh;
  margin-left: 200px;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  border-bottom: 1px solid #1f2d3d;
}

.logo h2 {
  margin: 0;
  font-size: 20px;
}

.el-menu-vertical {
  border-right: none;
}

.el-menu-vertical .el-menu-item {
  height: 50px;
  line-height: 50px;
}

.el-menu-vertical .el-menu-item:hover {
  background-color: #263445 !important;
}

.el-menu-vertical .el-menu-item.is-active {
  background-color: #263445 !important;
}

.logout-button {
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
}

.logout-item {
  color: #fff !important;
  font-size: 14px;
}

.logout-item:hover {
  color: #409EFF !important;
}

.el-main {
  padding: 20px;
  background-color: #f5f7fa;
}

:deep(.el-menu-item) [class^="el-icon"] {
  color: #fff;
  margin-right: 16px;
  width: 24px;
  text-align: center;
  font-size: 18px;
}

:deep(.el-menu-item):hover [class^="el-icon"],
:deep(.el-menu-item).is-active [class^="el-icon"] {
  color: #409EFF;
}
</style>
