import { createStore } from 'vuex'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

// 认证模块
const auth = {
  namespaced: true,
  state: {
    token: localStorage.getItem('token'),
    isLoggedIn: !!localStorage.getItem('token'),
    user: null
  },
  mutations: {
    setToken(state, token) {
      state.token = token
      state.isLoggedIn = !!token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },
    setUser(state, user) {
      state.user = user
    }
  },
  actions: {
    async login({ commit }, credentials) {
      try {
        const response = await axios.post(`${API_URL}/login`, credentials)
        commit('setToken', response.data.token)
        return response.data
      } catch (error) {
        throw new Error(error.response?.data?.message || '登录失败')
      }
    },
    async register({ commit }, credentials) {
      try {
        const response = await axios.post(`${API_URL}/register`, credentials)
        return response.data
      } catch (error) {
        throw new Error(error.response?.data?.message || '注册失败')
      }
    },
    logout({ commit }) {
      commit('setToken', null)
      commit('setUser', null)
    }
  }
}

// 骑行模块
const ride = {
  namespaced: true,
  state: {
    currentRide: null,
    rideHistory: []
  },
  mutations: {
    setCurrentRide(state, ride) {
      state.currentRide = ride
    },
    addToHistory(state, ride) {
      state.rideHistory.unshift(ride)
    }
  },
  actions: {
    async startRide({ commit }, bikeId) {
      try {
        const response = await axios.post(
          `${API_URL}/rides/start`,
          { bikeId },
          { headers: { Authorization: `Bearer ${this.state.auth.token}` } }
        )
        commit('setCurrentRide', response.data)
        return response.data
      } catch (error) {
        throw new Error(error.response?.data?.message || '开始骑行失败')
      }
    },
    async endRide({ commit, state }) {
      if (!state.currentRide) return
      
      try {
        const response = await axios.post(
          `${API_URL}/rides/end`,
          {
            rideId: state.currentRide.id,
            endLocation: state.currentRide.currentLocation
          },
          { headers: { Authorization: `Bearer ${this.state.auth.token}` } }
        )
        commit('addToHistory', response.data)
        commit('setCurrentRide', null)
        return response.data
      } catch (error) {
        throw new Error(error.response?.data?.message || '结束骑行失败')
      }
    }
  }
}

export default createStore({
  modules: {
    auth,
    ride
  }
}) 