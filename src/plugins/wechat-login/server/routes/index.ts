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
];
