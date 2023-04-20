import { Strapi } from '@strapi/strapi';

export interface ISignatureObj {
  signature: string,
  timestamp: string,
  nonce: string,
  echostr: string,
}

export default ({ strapi }: { strapi: Strapi }) => ({
  index(ctx) {
    const signature = ctx.request.query.signature;
    const timestamp = ctx.request.query.timestamp;
    const nonce = ctx.request.query.nonce;
    const echostr = ctx.request.query.echostr;
    const signatureObj: ISignatureObj = {
      signature,
      timestamp,
      nonce,
      echostr
    }
    ctx.body = strapi
      .plugin('wechat-login')
      .service('wechatService')
      // .getWelcomeMessage(); // 验证字符串
      .getSignature(signatureObj)
  },
});
