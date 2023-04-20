import { Strapi } from '@strapi/strapi';
import { ISignatureObj } from '../controllers/wechat';
import { pluginId } from '../pluginId';
const crypto = require('crypto');
let queryIdentification = `plugin::${pluginId}.wx-credential`

let weChatCredentials: WeChatCredentials | undefined

interface WeChatCredentials {
  token: string,
  appid:  string,
  sekey: string
}

export default ({ strapi }: { strapi: Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to pling';
  },
  async getWeChatCredentials(): Promise<WeChatCredentials> {
    if(weChatCredentials){
      return weChatCredentials
    }
    let data = await strapi.db.query(queryIdentification).findOne({limit: 1});
    // 暂存
    weChatCredentials = data
    return data;
  },
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
  },
  // 在微信浏览器跳转到登录页
  login(){

  }
});
