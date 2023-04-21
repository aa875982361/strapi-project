export default [
  {
    method: 'GET',
    path: '/',
    handler: 'wechatController.index',
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/',
    handler: 'wechatController.handleWechatMessage',
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/credentials',
    handler: 'wechatController.getCredentials',
    config: {
      policies: [],
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/credentials/add',
    handler: 'wechatController.createCredentials',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/auth',
    handler: 'wechatController.auth',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/auth/callback',
    handler: 'wechatController.authCallBack',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/auth/qrcode',
    handler: 'wechatController.qrCode',
    config: {
      policies: [],
      auth: false,
    },
  },
];
