const express = require('express');
const router = express.Router();
const User = require('../models/user')
const app = express();
const config = require('../../config/config')
const crypto =  require('crypto')
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cors =  require('cors')
const firebaseAdmin = require('firebase-admin');
const db = firebaseAdmin.firestore();
const bodyParser = require('body-parser');
const upload = require('../modules/upload');
const docRefUser = db.collection('user');
const docRefCourse = db.collection('renderCouse');

module.exports = (app) => {
  app.use('/', router);
};

router.get('/', (req, res, next) => {
	res.json({
		status:"Success",
		message:"REST API READY"
	})
});