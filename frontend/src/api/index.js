import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.success) {
      return res.data
    } else {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  error => {
    console.error('API请求错误:', error)
    return Promise.reject(error)
  }
)

export function getFunds() {
  return request({
    url: '/funds',
    method: 'get'
  })
}

export function getFundNav(code, months = 12) {
  return request({
    url: `/funds/${code}/nav`,
    method: 'get',
    params: { months }
  })
}

export function getCrisisScenarios() {
  return request({
    url: '/crisis-scenarios',
    method: 'get'
  })
}

export function createPortfolio(data) {
  return request({
    url: '/portfolios',
    method: 'post',
    data
  })
}

export function getPortfolio(id, params = {}) {
  return request({
    url: `/portfolios/${id}`,
    method: 'get',
    params
  })
}

export function backtestPortfolio(payload) {
  return request({
    url: '/portfolios/backtest',
    method: 'post',
    data: payload
  })
}
