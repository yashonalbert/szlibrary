import _ from 'lodash';
import Promise from 'bluebird';
import Sequelize from 'sequelize';
import sequelize from '../utils/sequelize';
import wechat from '../utils/wechat';
import config from '../utils/config';

const RecordModel = sequelize.define('record', {
  lentTime: Sequelize.DATE,
  returnTime: Sequelize.DATE,
  status: {
    type: Sequelize.STRING,
    allowNull: false,
  },
}, {
  classMethods: {
    getRecordByStatus(status) {
      if (status === 'confirming') {
        status = 'confirming';
      } else {
        status = { in: ['lent', 'returned', 'outdated'] };
      }
      return this.findAll({
        where: {
          status,
        },
        include: [{
          model: sequelize.model('book'),
          as: 'book',
        }, {
          model: sequelize.model('user'),
          as: 'user',
        }],
      });
    },
    getLentRecord(userID) {
      return this.findAll({
        where: {
          userID,
          status: {
            in: ['lent', 'outdated'],
          },
        },
        include: [{
          model: sequelize.model('book'),
          as: 'book',
        }, {
          model: sequelize.model('user'),
          as: 'user',
        }],
      });
    },
    getLentBooksCount(bookID) {
      return this.count({
        where: {
          bookID,
          status: {
            in: ['lent', 'outdated'],
          },
        },
      });
    },
    getRecordById(recordID) {
      return this.findById(recordID, {
        include: [{
          model: sequelize.model('book'),
          as: 'book',
        }, {
          model: sequelize.model('user'),
          as: 'user',
        }],
      });
    },
    getRecordByISBN(isbn) {
      return sequelize.model('book').getBook(isbn).then(book => this.findAll({
        where: {
          bookID: book.id,
          status: {
            in: ['lent', 'outdated'],
          },
        },
        include: [{
          model: sequelize.model('book'),
          as: 'book',
        }, {
          model: sequelize.model('user'),
          as: 'user',
        }],
        order: [['lentTime', 'ASC']],
      }));
    },
    lentBook(userID, bookID) {
      const recordDoc = {
        userID,
        bookID,
        status: 'confirming',
      };
      return this.findOne({ where: recordDoc }).then((old) => {
        if (_.isNull(old)) {
          return this.create(recordDoc);
        }
        return old.update({ updatedAt: new Date() });
      }).then(record => this.findOne({
        where: {
          id: record.id,
        },
        include: [{
          model: sequelize.model('book'),
          as: 'book',
        }, {
          model: sequelize.model('user'),
          as: 'user',
        }],
      })).then(record => record.sendNotification('lendBook', record));
    },
    returnBook(recordID) {
      return this.getRecordById(recordID).then(record => record.returnBook());
    },
  },
  instanceMethods: {
    returnBook() {
      // TODO 非原子判断
      if (['lent', 'outdated'].includes(this.status)) {
        return this.update({
          status: 'returned',
          returnTime: new Date(),
        });
      }
      return Promise.resolve(0);
    },
    sendNotification(template, records) {
      const to = { touser: '' };
      const message = {
        msgtype: 'text',
        text: {
          content: '',
        },
        safe: '0',
      };
      if (template === 'lendBook') {
        to.touser = records.user.corpUserID;
        message.text.content = `用户 ${records.user.name} 申请借阅 ${records.book.title}\n
          <a href="http://${config.domain}/records/all">点击进入授权页</a>`;
      }
      return Promise.promisify(wechat.send, { context: wechat })(to, message);
    },
    confirm(action) {
      // TODO 非原子判断
      if (this.status === 'confirming' && ['rejected', 'allowed'].includes(action)) {
        let actionPromise;
        if (action === 'rejected') {
          actionPromise = this.update({ status: 'rejected' });
        } else {
          actionPromise = this.update({
            status: 'lent',
            lentTime: new Date(),
          });
        }
        return actionPromise;
      }
      return Promise.resolve(0);
    },
  },
});

export default RecordModel;
