import { Strapi } from '@strapi/strapi';
import { pluginId } from '../pluginId';

export interface ISignatureObj {
  signature: string,
  timestamp: string,
  nonce: string,
  echostr: string,
}

export interface IConfig {
  token: string,
  appid:  string,
  app_secret: string
  host: string
  state: string
}

export default ({ strapi }: { strapi: Strapi }) => ({
  async getCredentials(ctx) {
    ctx.body = await strapi
      .plugin(pluginId)
      .service('wechatService')
      .getWeChatCredentials();
  },

  async createCredentials(ctx) {
    try {
      const {token, appid, app_secret, host} = ctx.request.query
      console.log("createCredentials", ctx.request.query)
      await strapi
        .plugin(pluginId)
        .service('wechatService')
        .createWeChatCredentials({
          token, appid, app_secret, host
        });

      ctx.body = { status: true }
    } catch (error) {
      console.log(error)
      ctx.body = { status: false }
    }
  },
    // 验证微信服务器传过来的字符串 是否正确
   async index(ctx) {
    const { signature, timestamp, nonce, echostr } = ctx.request.query
    const signatureObj: ISignatureObj = {
      signature,
      timestamp,
      nonce,
      echostr
    }
    ctx.body = await strapi
      .plugin('wechat-login')
      .service('wechatService')
      // .getWelcomeMessage(); // 验证字符串
      .getSignature(signatureObj)
  },
  // 微信网页打开 重定向到微信 让微信返回登录code
  async auth(ctx) {
    const wx_login_redirect_url = await strapi
      .plugin('wechat-login')
      .service('wechatService')
      .auth()
    console.log("wx_login_redirect_url", wx_login_redirect_url);
    // 重定向到微信的登录链接
    ctx.response.redirect(wx_login_redirect_url)

  },

  // 认证回调
  async authCallBack(ctx){
    const { code } = ctx.request.query
    // 重定向到网页
    const {token} = await strapi
      .plugin('wechat-login')
      .service('wechatService')
      .authCallBack(code)
    console.log("callback token ", token);
    // 重定向到微信的登录链接
    ctx.response.redirect(`http://www.nisonfuture.cn/main?token=${token}`)
  },
  // pc登录 获取二维码
  async qrCode(ctx){
    // 获取到二维码 和 scene
    const { scene, qrcodeUrl } = await strapi
      .plugin('wechat-login')
      .service('wechatService')
      .qrCode()
    console.log("qrCode scene ", scene);
    ctx.body = { scene, qrcodeUrl }
  },
  // 接受微信推送的消息
  async handleWechatMessage(ctx){
    console.log("handleWechatMessage request", ctx.request)
    // const res = await strapi
    //   .plugin('wechat-login')
    //   .service('wechatService')
    //   .qrCode()
    ctx.response.body = "success"
  }
});
