const path = require('path');
const rootPath = path.normalize(__dirname + '/..');
const env = process.env.NODE_ENV || 'development';
const firebaseAdmin = require('firebase-admin');

var serviceAccount = require('../serviceAccountKey.json');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});

const db = firebaseAdmin.firestore();

const config = {
  development: {
    root: rootPath,
    app: {
      name: 'backend'
    },
    port: process.env.PORT || 3000,
    db: firebaseAdmin.firestore(),
    secret: 'inirahasia',
    host: 'smtp.gmail.com',
    portSmtp: 465,
    secure: true, 
    auth: {
        user: 'doesgen5@gmail.com', 
        pass: 'tanyavinna' 
    }
  },

  test: {
    root: rootPath,
    app: {
      name: 'backend'
    },
    port: process.env.PORT || 3000,
    db: firebaseAdmin.firestore(),
    secret: 'inirahasia',
    host: 'smtp.gmail.com',
    portSmtp: 465,
    secure: true, 
    auth: {
        user: 'doesgen5@gmail.com', 
        pass: 'tanyavinna' 
    }
  },

  production: {
    root: rootPath,
    app: {
      name: 'backend'
    },
    port: process.env.PORT || 3000,
    db: firebaseAdmin.firestore(),
    secret: 'inirahasia',
    host: 'smtp.gmail.com',
    portSmtp: 465,
    secure: true, 
    auth: {
        user: 'doesgen5@gmail.com', 
        pass: 'tanyavinna' 
    }
  }
};

module.exports = config[env];

