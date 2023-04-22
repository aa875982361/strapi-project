import { Strapi } from '@strapi/strapi';
import { IConfig, ISignatureObj } from '../controllers/wechat';
import { pluginId } from '../pluginId';
const crypto = require('crypto');
const querystring = require("querystring");
import axios from "axios"
// const httpsProxyAgent = require('https-proxy-agent');
import { HttpsProxyAgent } from "https-proxy-agent"
import { generateRandomString, getOnlyOneScene, getSceneToken, setSceneToken } from '../utils/sceneManager';
import { request } from './request';
import { getAccessToken } from './accessToken';
import { QrCodeBase } from '../utils/url';


let queryIdentification = `plugin::${pluginId}.wx-credential`
const httpsAgent = new HttpsProxyAgent("http://127.0.0.1:7890");

let weChatCredentials: WeChatCredentials | undefined

type WeChatCredentials = IConfig & {
  // 配置没有id
  id: string
}

/**
 * 用户信息
 */
export interface IUserInfo {
  nickName: string
}

/**
 * 认证完成返回回调数据
 */
export interface IAuthCallBack {
  // jwt token
  token: string,
  // 用户信息
  user: any,
}
/**
 * 获取二维码接口的返回结果
 */
export interface IQrCodeResult {
  qrcodeUrl: string,
  scene: string
}

class WechatServices {
  strapi: Strapi
  constructor(_strapi: Strapi){
    this.strapi = _strapi
  }
  getWelcomeMessage() {
    return 'Welcome to pling';
  }
  /**
   * 获取配置
   * @returns
   */
  async getWeChatCredentials(): Promise<WeChatCredentials> {
    if(weChatCredentials){
      return weChatCredentials
    }
    let data = await this.strapi.db.query(queryIdentification).findOne({limit: 1});
    // 暂存
    weChatCredentials = data
    return data;
  }
  /**
   * 配置appid token  和 app_secret
   * @param data
   */
  async createWeChatCredentials(data: IConfig) {
    // 获取原有配置
    let credentials = await this.getWeChatCredentials();
    if (!credentials) {
      // 没有就创建
      await this.strapi.db.query(queryIdentification).create({
        data
      });
    } else {
      // 有就更新
      await this.strapi.db.query(queryIdentification).update({
        where: { id: credentials.id },
        data
      });
      // 置空
      weChatCredentials = undefined
    }
    await this.getWeChatCredentials();
  }
  // 验证微信服务器配置
  async getSignature(signatureObj: ISignatureObj){
    const { token } = await this.getWeChatCredentials()
    // 拿出需要的数据
    const { timestamp, nonce, signature, echostr } = signatureObj
    const signatureArr = [token, timestamp, nonce];
    console.log("signatureArr", signatureArr);

    signatureArr.sort();
    const signatureStr = signatureArr.join('');
    const genSignature = crypto.createHash('sha1').update(signatureStr).digest('hex');
    console.log("genSignature", genSignature);
    console.log("signature", signature);

    if (genSignature === signature) {
      return echostr
    } else {
      return "illegal signature"
    }
  }
  // 在微信浏览器跳转到登录页
  async auth(){
    // redirect_uri 是微信授权后回调的地址，需要在微信公众号平台上配置
    const { appid, host, state} = await this.getWeChatCredentials()
    const redirect_url = `${host}/api/wechat/auth/callback`
    const scope = "snsapi_userinfo";
    const appId = appid;

    const params = {
      appid: appId,
      redirect_uri: redirect_url,
      response_type: "code",
      scope: scope,
      state,
    };

    // 构建登录请求
    const url = `https://open.weixin.qq.com/connect/oauth2/authorize?${querystring.stringify(
      params
    )}#wechat_redirect`;

    return url;
  }
  // 微信登录认证回调
  async authCallBack(code: string): Promise<IAuthCallBack> {
    // 用code 去换用户openid
    // redirect_uri 是微信授权后回调的地址，需要在微信公众号平台上配置
    const { appid, host, app_secret} = await this.getWeChatCredentials()

    if (!appid || !app_secret) {
      console.warn("Missing credentials appid, app_secret", appid, app_secret)
      throw { error: true, message: "Missing credentials" }
    }
    // 获取access_token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${app_secret}&code=${code}&grant_type=authorization_code`
    const { data: tokenData } = await axios.request({
      url: tokenUrl,
      httpsAgent,
      proxy: false,
      method: "GET"
    });

    // 获取用户信息
    const { access_token, openid } = tokenData;
    console.log("openid", openid, tokenData)
    const { data: userInfo } = await axios.request({
      url: `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`,
      httpsAgent,
      proxy: false,
      method: "GET"
    })
    // 拿当前数据库里面 openid 对应的数据
    const user = await this.strapi.db.query('plugin::users-permissions.user').findOne({ where: { openid } });
    if (!user) {
      // 之前不存在信息
      let randomPass = generateRandomString(10)
      let password = await this.strapi.service("admin::auth")!.hashPassword(randomPass);
      let newUser = await this.strapi.db.query('plugin::users-permissions.user').create({
        data: {
          password,
          openid,
          wechatUserInfo: userInfo,
          confirmed: true,
          blocked: false,
          role: 1,
          provider: "local"
        }
      })
      console.log("newUser", newUser, userInfo)

      return {
        token: this.strapi.plugin('users-permissions').service('jwt').issue({ id: newUser.id }),
        user: this.strapi.service('admin::user')!.sanitizeUser(newUser),
      }
    }
    // 需要更新数据 因为第一次拿回到的用户信息 名称是错的 只有微信用户 和灰色头像
    console.log("user", user, userInfo)
    return {
      token: this.strapi.plugin('users-permissions').service('jwt').issue({ id: user.id }),
      user: this.strapi.service('admin::user')!.sanitizeUser(user),
    }
  }
  /**
   * 生成一个二维码链接，和 对应的scene
   */
  async qrCode(): Promise<IQrCodeResult> {
    const { appid, host, app_secret} = await this.getWeChatCredentials()
    // 场景值
    const scene = getOnlyOneScene()
    console.log("wechat service qrCode scene", scene);

    const accessToken = await getAccessToken(appid, app_secret)
    console.log("wechat service qrCode accessToken", accessToken)
    // 构建请求url
    const getQrCodeUrl = `${QrCodeBase}?access_token=${accessToken}`
    console.log("wechat service qrCode getQrCodeUrl", getQrCodeUrl);

    // {"ticket":"gQH47joAAAAAAAAAASxodHRwOi8vd2VpeGluLnFxLmNvbS9xL2taZ2Z3TVRtNzJXV1Brb3ZhYmJJAAIEZ23sUwMEmm
    // 3sUw==","expire_seconds":60,"url":"http://weixin.qq.com/q/kZgfwMTm72WWPkovabbI"}
    // 文档：https://developers.weixin.qq.com/doc/offiaccount/Account_Management/Generating_a_Parametric_QR_Code.html
    // 获取ticket
    const response = await request({
      url: getQrCodeUrl,
      method: "POST",
      data: {
        "expire_seconds": 604800,
        "action_name": "QR_STR_SCENE",
        "action_info": {
          "scene": {
            "scene_str": scene
          }
        }
      }
    })
    console.log("wechat service qrCode getQrCodeUrl response", response.data);

    const { ticket, expire_seconds, url } = response?.data || {}
    console.log("wechat service qrCode ticket", ticket);
    console.log("wechat service qrCode url", url);

    // 生成二维码图片的URL
    const qrcodeUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;

    const result = {
      qrcodeUrl,
      scene
    }
    console.log("wechat service qrCode result", result);
    return result
  }
  // 接受微信推送过来的消息
  async handleWechatMessage(data): Promise<string>{
    /**
     * 示例数据格式：
     * 已关注扫码得到的消息
     *  {
          ToUserName: 'gh_00eefa0749a6',
          FromUserName: 'oPuYn6s3yuFnvmk74ZhYajZyrVCY',
          CreateTime: '1682171664',
          MsgType: 'event',
          Event: 'SCAN',
          EventKey: 'PCdIGABHQ1LscQsLqL1ryaypsjKvkkIZ',
          Ticket: 'gQEu8DwAAAAAAAAAAS5odHRwOi8vd2VpeGluLnFxLmNvbS9xLzAybjV6Wk1SLUNjREcxaHhzZGhBY2cAAgTh4UNkAwSAOgkA'
        }
        未关注扫码得到的消息
        {
           ToUserName: 'gh_00eefa0749a6',
           FromUserName: 'oPuYn6l7-3-UQuqCRUnCPz9RvBYU',
           CreateTime: '1682172458',
           MsgType: 'event',
           Event: 'subscribe',
           EventKey: 'qrscene_PCdIGABHQ1LscQsLqL1ryaypsjKvkkIZ',
           Ticket: 'gQEu8DwAAAAAAAAAAS5odHRwOi8vd2VpeGluLnFxLmNvbS9xLzAybjV6Wk1SLUNjREcxaHhzZGhBY2cAAgTh4UNkAwSAOgkA'
        }
     */
    const {Event: eventName, EventKey: eventKey = [], FromUserName: userOpenId} = data
    switch(eventName){
      case "SCAN":
        const scene = eventKey || ""
        if(!userOpenId || !scene){
          console.warn("没有用户openid 或者没有scene", userOpenId, scene)
        }else{
          // 设置场景值对应的openid
          setSceneToken(scene, userOpenId)
        }
        break
      case "subscribe":
        // qrscene_AmQ2SGOMsnpiK7OOeXVOMMC35FxNxfkO
        const qrSceneStr = eventKey || ""
        // 如果是扫码关注的场景
        // 需要分割场景值
        const realScene = qrSceneStr.split("_")[1] || ""
        if(!userOpenId || !realScene){
          console.warn("没有用户 openid 或者没有 realScene", userOpenId, realScene)
        }else{
          // 设置场景值对应的openid
          setSceneToken(realScene, userOpenId)
        }
        break
    }
    // 如果前面没有返回值 默认返回成功
    return "success"
  }
  async checkScene(scene: string): Promise<string>{
    return getSceneToken(scene)
  }
}

export default function({ strapi }: { strapi: Strapi }): WechatServices {
  return new WechatServices(strapi)
}
