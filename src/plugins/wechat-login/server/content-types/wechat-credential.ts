export default {
    "kind": "singleType",
    info: {
        "displayName": "WeChat Credentials",
        "singularName": "wx-credential",
        "pluralName": "wx-credentials",
        "description": "Stores WeChat Mini program credentials",
        "tableName": "wechat_auth_creds",
    },
    options: {
        "privateAttributes": ["id", "created_at"],
        "populateCreatorFields": true,
        "draftAndPublish": true
    },
    pluginOptions: {
        "content-manager": {
            "visible": false
        },
        "content-type-builder": {
            "visible": false
        }
    },
    attributes: {
        "appid": {
            "type": "string",
            "configurable": true,
            "required": true,
            "default": null
        },
        "app_secret": {
            "type": "string",
            "configurable": true,
            "required": true,
            "default": null
        },
        "token": {
            "type": "string",
            "configurable": true,
            "required": true,
            "default": null
        },
        "state": {
            "type": "string",
            "configurable": true,
            "required": true,
            "default": null
        },
        "host": {
            "type": "string",
            "configurable": true,
            "required": true,
            "default": null
        }
    }
}
