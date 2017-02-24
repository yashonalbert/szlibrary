import _ from 'lodash';
import Sequelize from 'sequelize';
import sequelize from '../utils/sequelize';

const UserModel = sequelize.define('user', {
  corpUserID: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  department: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  position: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  mobile: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  gender: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  weixinID: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  avatar: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  role: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'user',
  },
}, {
  indexes: [{
    unique: true,
    fields: ['corpUserID'],
  }],
  instanceMethods: {
    getLentRecord() {
      return sequelize.model('record').getLentRecord(this.id);
    },
    lentInfo(isbn) {
      return sequelize.model('book').findOne({
        where: {
          isbn,
        },
      }).then((book) => {
        if (book) {
          return this.getLentRecord().then((records) => {
            if (records[0].status === 'outdated' || records[1].status === 'outdated') {
              return Promise.resolve({ book, check: 'record status outdated' });
            } else if (records >= 2) {
              return Promise.resolve({ book, check: 'record >= 2' });
            }
            return sequelize.model('book').getStock(book.id).then((stock) => {
              if (stock <= 0) {
                return Promise.resolve({ book, check: 'no stock' });
              }
              return Promise.resolve({ book, check: stock });
            });
          });
        }
        return Promise.resolve({ book: {}, check: 'no book' });
      });
    },
    lentBook(bookID) {
      return sequelize.model('book').getStock(bookID).then((stock) => {
        if (stock <= 0) {
          throw new Error('没书了');
        }
        return sequelize.model('record').lentBook(this.id, bookID);
      });
    },
    returnBook(bookID) {
      return sequelize.model('record').returnBook(this.id, bookID);
    },
    sendNotification(template, ...args) {
      if (template === 'borrowBook') {
        const bookID = _.first(args);
        // TODO: 发往微信
      }
    },
  },
});

export default UserModel;
