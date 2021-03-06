import { Dialog } from 'quasar'
import axios from 'axios'
import to from 'await-to-js'
import qs from 'qs'
import store from './store'
import _ from 'lodash'

function cancelSource () {
  const CancelToken = axios.CancelToken
  return CancelToken.source()
}

async function request (url, method = 'get', data = {}, other = {}, silent = false, responseType = 'json') {
  let params = null
  let contentType = 'application/json'
  method = method.toLowerCase()
  if (method === 'get' || method === 'delete') {
    params = data
    params['_t'] = +new Date()
  } else if (method === 'form') {
    method = 'post'
    contentType = 'application/x-www-form-urlencoded'
    data = qs.stringify(data)
  }
  if (!_.startsWith(url, '/')) {
    url = `/${url}`
  }
  let server = window.location.origin
  url = `${server}${url}`
  console.log(`%c${url}`, 'font-weight: bold')

  const config = _.assignIn({
    url,
    method,
    data,
    responseType,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-type': contentType
    },
    params: params
  }, other)
  let [err, resp] = await to(axios.request(config))
  if (err || !resp || !resp.data) {
    if (err && err.response) {
      err = err.response.data
    }
    console.log({
      err,
      resp
    })
    if (!resp) {
      resp = {}
    }
    resp.data = {
      success: false,
      message: err ? err.message : '未知错误',
      data: null
    }
  }

  if (resp.data.success === undefined) {
    return resp.data
  }

  if (!silent) {
    notifyResponse(resp.data)
  }

  return resp.data
}

function notifyResponse (resp) {
  if (_.isString(resp)) {
    resp = {
      success: false,
      message: resp
    }
  }
  if (resp.success === false && resp.message) {
    const config = {
      title: '错误',
      message: resp.message,
      color: 'negative'
    }
    Dialog.create(config)
  }
}

function notifySuccess (resp, cb = null) {
  if (!resp || _.isString(resp)) {
    resp = {
      success: true,
      message: resp
    }
  }
  if (resp.success) {
    Dialog.create({
      title: '消息',
      message: resp.message || '操作成功！',
      color: 'positive'
    }).then(() => {
      cb && cb()
    })
  }
}

function bindState (module, field, newField = null) {
  newField = newField || field
  const o = {}
  o[newField] = {
    get () {
      return store.state[module][field]
    },
    set (value) {
      const n = {}
      n[field] = value
      store.commit(`${module}/update`, n)
    }
  }
  return o
}

function bindStateChild (module, child, field = null, newField = null) {
  const o = {}
  const fields = field ? [field] : Object.keys(store.state[module][child])
  _.forEach(fields, field => {
    o[newField || field] = {
      get () {
        return store.state[module][child][field]
      },
      set (value) {
        const n = {}
        n[field] = value
        store.commit(`${module}/updateChild`, {
          key: child,
          value: n
        })
      }
    }
  })
  return o
}

function bindStateSelect (module, field, newField = null, nullable = true) {
  newField = newField || field

  const o = {}
  o[newField] = {
    get () {
      let values = []
      if (module) {
        values = store.state[module][field]
      } else {
        values = this[field]
      }
      if (nullable) {
        values.unshift({
          label: 'None',
          value: null
        })
      }
      return values
    }
  }
  return o
}

function EventHandlerMixin (eventName, method = 'reload') {
  return {
    mounted () {
      return this.$root.$on(eventName, this[method])
    },
    beforeDestroy () {
      return this.$root.$off(eventName, this[method])
    }
  }
}

function isNumeric (x) {
  return ((typeof x === 'number' || typeof x === 'string') && !isNaN(Number(x)))
}

function redirectRoot (url) {
  if (window.parent !== window) {
    window.parent.location.href = url
  } else {
    window.location.href = url
  }
}

export {
  cancelSource,
  request,
  notifyResponse,
  notifySuccess,
  bindState,
  bindStateChild,
  bindStateSelect,
  EventHandlerMixin,
  isNumeric,
  redirectRoot
}
