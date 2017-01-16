/* eslint-disable max-len */

import _ from 'lodash';
import Promise from 'bluebird';
import Router from 'koa-router';
import wechat from '../utils/wechat';
import { RecordModel, UserModel } from '../models';
import config from '../utils/config';

const router = Router({ prefix: '/user' });

router.get('/jssign', async (ctx) => {
  const param = {
    debug: false,
    jsApiList: ctx.query.jsApiList.split(','),
    url: ctx.query.url,
  };
  ctx.body = await Promise.promisify(wechat.getJsConfig, { context: wechat })(param);
});

router.get('/oauth2', (ctx) => {
  ctx.redirect(`https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.wechat.corpid}&redirect_uri=${encodeURIComponent(`http://${config.domain}/user/login`)}&response_type=code&scope=snsapi_base`);
});

router.get('/login', async (ctx) => {
  if (!ctx.query.code) {
    ctx.throw(400, 'code is required !');
  }
  const { UserId } = await Promise.promisify(wechat.getUserIdByCode, { context: wechat })(ctx.query.code);
  const result = await Promise.promisify(wechat.getUser, { context: wechat })(UserId);
  const userData = _.extend(_.pick(result, ['name', 'position', 'mobile', 'gender', 'email', 'avatar', 'status']),
    { department: _.toString(result.department), weixinID: result.weixinid, corpUserID: result.userid });

  await UserModel.upsert(userData);
  const user = await UserModel.findOne({ where: { corpUserID: userData.corpUserID } });
  ctx.cookies.set('userID', user.id, { signed: true });

  ctx.redirect('/');
});

router.post('/records', async (ctx) => {
  ctx.body = await ctx.user.lentBook(ctx.request.body.bookID);
});

router.get('/records', async (ctx) => {
  ctx.body = await ctx.user.getLentRecord();
});

router.get('/records/:recordID', async (ctx) => {
  const record = await RecordModel.findById(ctx.params.recordID);
  if (record.userID === ctx.user.id) {
    ctx.body = record;
  } else {
    ctx.body = {};
  }
});


export default router;
