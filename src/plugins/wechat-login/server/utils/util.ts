import { parseString } from "xml2js"

/**
 * 将xml的数据 转换为对象
 * @param xmlData
 * @returns
 */
export function handleXml2Object(xmlData: string): Promise<any>{
  return new Promise((resolve, reject) => {
    //解析xml
    parseString(xmlData,{ explicitArray : false },function(err,result){
      if(!err){
          //打印解析结果
          console.log("handleXml2Object result", result);
          resolve(result)
      }else{
           //打印错误信息
          console.warn("handleXml2Object", err);
          reject(err)
      }
  })
  })
}
