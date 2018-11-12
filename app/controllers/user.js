const express = require('express');
const router = express.Router();
const User = require('../models/user')
const app = express();
const config = require('../../config/config')
const bcrypt =  require('bcryptjs')
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
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.all('/*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Origin, Origin, X-Requeted-With, Content-Type, Accept, x-access-token, RBR");
	if (req.headers.origin) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
	}
	if (req.method === 'OPTIONS') {
		res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
		return res.status(200).json({});
	}
});


// USER REGISTER GOOGLE
router.post('/v1/registergoogle', (req, res, next) => {
	var idExist
	console.log(req.body.google_id)
	var docRefUser = db.collection('user');
	var getRefUserUsername = docRefUser.where('google_id', '==', req.body.google_id)

	async function registerGoogle() {
		try {
			await docRefUser.get().then(snapshot => {
				snapshot.forEach(doc => {
					if (doc.data().google_id == req.body.google_id) {
						idExist = doc.data()
						console.log('user ono: ', idExist)
					}
				})					
			})

			if (idExist) {
				res.status(400).json({
					status: 'Failed',
					message: 'id exist'
				})
			}
			else {
				console.log('save data')
				docRefUser.add({
					username: req.body.username,
					fullname: req.body.fullname,
					email: req.body.email,
					avatar: req.body.avatar,
					role: req.body.role,
					active: req.body.active,
					token: req.body.token,
					verified: req.body.verified,
					google_id: req.body.google_id
				})
			    .then((snapshot) => {
			    	console.log('User added: ', snapshot.id)
			    	res.status(200).json({
			    		status: 'Success',
			    		message: 'User berhasil register'
			    	});
			    })
			    .catch((err) => {
			      console.log('Error adding user', err);
			    });
			}
		} catch (err) {
			console.log('Opps, an error occured', err)
		}
	}
	registerGoogle();
})

// USER REGISTER
router.post('/v1/register', (req, res, next) => {
	var usernameExist
	var emailExist
	var docRefUser = db.collection('user');
	var getRefUserEmail = docRefUser.where('email', '==', req.body.email)
	var getRefUserUsername = docRefUser.where('username', '==', req.body.username)
	const hashPassword = crypto.createHash('md5').update(req.body.password).digest('hex')
	var inputID

	async function registerUser() {
		try {

		await getRefUserUsername.get().then(snapshot => {
			snapshot.forEach(doc => {
				console.log('data username =>', doc.data())
				usernameExist = doc.data()
			})
		})

		await getRefUserEmail.get().then(snapshot => {
			snapshot.forEach(doc => {
				console.log('data email =>', doc.data())
				emailExist = doc.data()
			})
		})

		if (usernameExist) {
			res.status(400).json({
				status: 'Failed',
				message: 'Username exist'
			})
		}
		else if (emailExist) {
			res.status(400).json({
				status: 'Failed',
				message: 'Email exist'
			})
		} 
		else if (emailExist && usernameExist) {
			res.status(400).json({
				status: 'Failed',
				message: 'Username and Email exist'
			})
		} else {

			db.collection('user').add({
				username: req.body.username,
				fullname: req.body.fullname,
				password: hashPassword,
				email: req.body.email,
				gender: req.body.gender,
				birthday: req.body.birthday,
				avatar: req.body.avatar,
				role: req.body.role,
				active: req.body.active,
				verified: req.body.verified,
				token: req.body.token,
				token_expired: req.body.token_expired,
				google_id: req.body.google_id
			})
		    .then((snapshot) => {
		    	res.status(200).json({
		    		auth: true,
		    		message: 'Berhasil register'
		    	});
		    })
		    .catch((err) => {
		      console.log('Error adding user', err);
		    });
		}

		} catch (err) {
			console.log('Opps, an error occured', err)
		}
	}
	registerUser();
})

// USER CHANGE PASSWORD
router.put('/v1/changepassword', (req, res, next) => {
	var token = req.headers['x-access-token'];
	var hashCurrentPassword = crypto.createHash('md5').update(req.body.current_password).digest('hex')

	if (!token) {
		res.status(401).send({auth: false, message: 'No token provided'})
	} else {
		jwt.verify(token, config.secret, function(err, decoded) {
			console.log('masuk verify')
			var userRef = db.collection('user');
			var getDoc = userRef.select('password').where('password', '==', hashCurrentPassword).get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					if (decoded && hashCurrentPassword == doc.data().password) {
						var userRefID = db.collection('user').doc(decoded.id);
						const hashPassword = crypto.createHash('md5').update(req.body.new_password).digest('hex')
						var updateUserRef = userRefID.update({password: hashPassword})
				    	res.status(200).send({auth: true, message: 'Berhasil change password'});
					}
					else {
						res.status(500).send({auth: false, message: 'Failed to authenticate token'})
					}
				});
			})
			.catch(err => {
				console.log('Error getting documents', err);
			});
		})
	}
});

// USER DE-ACTIVATE ACCOUNT
router.put('/v1/deactivate', (req, res, next) => {
	var token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			console.log(decoded);
			var docRef = db.collection('user').doc(decoded.id);
			var getRole = docRef.get()
			.then(doc => {
				if (!doc.exists) {
					res.status(400).send({
						message: "User id does not exist"
					});

				} else if (doc.data().role == 'admin' || doc.data().role == 'student') {
					var data = docRef.update({
					  active: req.body.active
					});
					res.status(200).send({
						message: "Account deactivated"
					});
				} else {
					res.status(400).send({
						message: "No user or admin log-in"
					});
				}
			})
			.catch(err => {
				console.log('Error getting document', err)
			});
		}
	});
});

// ACTIVATION VERIFICATION TO EMAIL USER 
router.post('/v1/verification', (req, res, next) => {
	var colRef = db.collection('user');

	var login = {
		email: req.body.email,
		password: req.body.password
	}

	var getRef = colRef.select('email').where('email', '==', login.email)
	getRef.get().then(snapshot => {
		
		snapshot.forEach(doc => {
			var idUser = doc.id

			if (idUser) {
				var token = jwt.sign({
					id: idUser,
				}, config.secret, {
					expiresIn: '24h'
				});

			    let transporter = nodemailer.createTransport({
			        host : config.host,
			        port: config.portSmtp,
			        secure: config.secure, 
			        auth: {
			        	user: config.auth.user,
			        	pass: config.auth.pass
			        }
			    });

			    let mailOptions = {
			        from: '"E-Class Online Course" <doesgen5@gmail.com>',
			        to: login.email,
			        subject: 'E-Class Activation Account Verification',
			        text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/v1' + '\/confirmation\/' + token + '\/id\/' + idUser + '.\n',
			    };

			    transporter.sendMail(mailOptions, (error, info) => {
			        if (error) {
			            res.send(error);
			        }
			        console.log('Message sent: %s', info.messageId);
			    });

			    res.status(200).send({
			    	message: "Success, verification email sent",
					id_user: idUser
			    });
			} else {
				res.status(400).send({
					message: "Email does not exist"
				});
			}
    	});
    })
	.catch(err => {
		console.log('Error getting documents', err);
	});
});

// GET TOKEN & ACTIVATE ACCOUNT
router.use('/v1/confirmation/:token', function(req, res, next) {
	var token = req.params.token;
	if (req.method === 'GET') {
		if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });
			jwt.verify(token, config.secret, function(err, decoded) {
				if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
				res.status(200).send({data_token: decoded, token: req.params.token});
			});
	} else if (req.method === 'PUT') {
		jwt.verify(token, config.secret, function(err, decoded) {
			if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
				var docRef = db.collection('user').doc(decoded.id);
				var data = docRef.update({
				  active: req.body.active
				});
				res.status(200).send({
					message: "Account activated"
				});
		});
	}
});

// FORGOT PASSWORD 
router.post('/v1/forgotpassword', (req, res, next) => {
	var emailExist;
	var emailExistId;
	var docRefUser = db.collection('user');
	var getRefUserEmail = docRefUser.where('email', '==', req.body.email);
 	async function sendEmailToken() {
		try {
			await getRefUserEmail.get().then(snapshot => {
				snapshot.forEach(doc => {
					emailExist = doc.data().email;
					emailExistId = doc.id;
				})
			})
		    .catch((err) => {
		      console.log('Error saving token', err);
		    })
 			if (emailExist) {
 				console.log(emailExistId);
				var token = jwt.sign({
					id: emailExistId,
				}, 'server secret', {
					expiresIn: '24h'
				});
				
		    	let transporter = nodemailer.createTransport({
			        host : config.host,
			        port : config.portSmtp,
			        secure : config.secure, 
			        auth : {
						user: config.auth.user,
						pass: config.auth.pass
					}
			    });

			    let mailOptions = {
			    	from: '"E-Class Online Course" <doesgen5@gmail.com>',
			    	to: emailExist,
			    	subject: 'E-Class Activation Account Verification',
			    	text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/v1' + '\/confirmation\/' + token + '.\n'
			    }
			    transporter.sendMail(mailOptions, (error, info) => {
			        if (error) {
			            res.send(error);
			        } else {
				        console.log('Message sent: %s', info.messageId);
				        console.log("tokenz : " + 'http:\/\/' + req.headers.host + '\/v1' + '\/confirmation\/' + token)
				    	res.status(200).send({
				    		status: 'Success',
				    		message: 'Email sudah terkirim',
				    		tokenz: 'http:\/\/' + req.headers.host + '\/v1' + '\/confirmation\/' + token
				    	});
		    		}
			    });

			} else {
				console.log('email tidak ada')
				res.status(400).json({message: 'email tidak ada'})			
			}
		} catch (err) {
			console.log('Something error: ', err)
		}
	}
 	sendEmailToken();
}); 

// RESET PASSWORD
router.use('/v1/confirmation/:token', (req, res, next) => {
	var id_token;
	var userRef;
	jwt.verify(req.params.token, 'server secret', function(err, decoded) {
		if (req.method === 'GET') {
			if (decoded) {
				res.status(200).json({auth: true, message: 'Token is exist', data_token: decoded, token: req.params.token})
			} else {
				res.status(500).json({auth: false, message: 'Failed to Authenticated'})
			}
		} else if (req.method === 'PUT') {
			var hashPassword = crypto.createHash('md5').update(req.body.password).digest('hex');
			id_token = decoded.id;
			userRef = db.collection('user').doc(id_token);
			userRef.update({password: hashPassword})
			res.status(200).json({message: 'Reset password success'})
		}
	});
});

// GET USER BY ID
router.get('/v1/users/:id', (req, res, next) => {
	var reqId = req.params.id;
	docRefUser.doc(reqId).get()
	.then(doc => {
		if(doc.exists) {
			var userData = {}
			for (var i in doc.data()) {
				if(i != 'password') {
					userData[i] = doc.data()[i]
				}
			}
			res.status(200).json({
				statusReponse: "Ok",
				message : "User found",
				userData: userData
			})	
		} else {
			res.status(404).json({
				statusReponse: " Not found",
				message : id + " user not found"
			})
		}
	})
	.catch((err) => {
		console.log('Error getting files')
	})
});

// USER LOGIN
router.post('/v1/login', (req, res, next) => {
	const hashPassword = crypto.createHash('md5').update(req.body.password).digest('hex')
	const reqUser = req.body.username;
	const reqEmail = req.body.email;

	docRefUser.get()
	.then((snapshot) => {
		next(true, snapshot)
	})
	.catch((err) => {
		next(false, err)
	});

	function compare(user, callback) {
		if(user.username == reqUser || user.email == reqEmail) {
			if(user.password == hashPassword) {
				callback(true)	
			}
		} else {
			callback(false)
		}
	}

	function next(finish, snapshot){
		var code;
		var message;
		if(finish) {
			var userExists = false;
			var emailExists = false;

			snapshot.forEach((doc) =>  {
				if(doc.data().username == reqUser || doc.data().email == reqUser) {
					userExists = doc.data();
					id = doc.id;
					active = doc.data().active;
				}
			})

			snapshot.forEach((doc) =>  {
				if(doc.data().email == reqEmail || doc.data().username == reqEmail) {
					emailExists = doc.data();
					id = doc.id;
					active = doc.data().active;
				}
			})
			if(userExists || emailExists) {
				if(active == true) {
					console.log('User active')
				}else{
					code = 404;
					message = 'User deactive'	
				}

				compare(userExists, function(compared) {
					if(compared){
						var token = jwt.sign({id: id}, config.secret, {
							expiresIn: '24h'
						});
						code = 200;
						message = 'Login success';
						tokens = token;
						console.log(tokens);
					}else{
						code = 403;
						message = 'Login failed'
					}
				});

				compare(emailExists, function(compared) {
					if(compared){
						var token = jwt.sign({id: id}, config.secret, {
							expiresIn: '24h'
						});

						code = 200;
						message = 'Login success';
						tokens = token;
						console.log(tokens);
					}else{
						code = 403;
						message = 'Login failed'
					}
				});
			}else{
				code = 404;
				message = 'User not exists'	
			}
		}else{
			code = 400;
			message = 'firebase error'
		}

		if(code == 200) {
			res.status(code).json({message, tokens, ID: id})
		} else {
			res.status(code).json({message})
		}
	}
});

// USER LOGIN WITH GOOGLE
router.post('/v1/logingoogle', (req, res, next) => {
	var idEx;
	var reqGoogleId = req.body.google_id;
	var getRefGoogleId = docRefUser.select('google_id').where('google_id', '==', reqGoogleId)

	getRefGoogleId.get()
	.then(snapshot => {
		snapshot.forEach(doc => {
			idEx = doc.data().google_id
			id = doc.id
		})

		if(idEx == reqGoogleId) {
			var token = jwt.sign({id: id}, config.secret, {
				expiresIn: '24h'
			});

			res.status(200).json({
	    		status: 'Success',
	    		message: 'Google id matched',
	    		ID : id,
	    		tokens: token
	    	});
		}else{
			res.status(403).json({
	    		status: 'Forbidden',
	    		message: 'Try again or sign up'
	    	});
		}
	})
	.catch((err) => {
		console.log('Error getting files')
	})
});

// USER UPLOAD AVATAR
router.put('/v1/upload/:id', (req, res, next) => {
	var fs = require('fs');
	db.collection('user').doc(req.params.id).get()
		.then((doc) => {
			var getData = doc.data().avatar.filename;	
			fs.unlink('./public/upload/' + getData, function(err) {
				if (err) {
					console.log(err);
				} else {
					console.log('file removed');
				}
			})
	});
	upload(req, res, (err) => {			
		docRefUser.doc(req.params.id).update({
			avatar: req.file
		})
		.then(doc => {
			res.status(200).json({
				status: 'OK',
				message: 'Avatar updated successfully',
				url: req.protocol + '://' + req.get('host') + '/public/upload/' +req.file.filename
			})
		})
		.catch((err) => {
			console.log('Error getting files')
		})
	});
});

// USER EDIT PROFILE 
router.put('/v1/editProfile/:id',  (req, res, next) => {
	var usernameAda;
	var emailAda;
	var getRefUserEmail = docRefUser.where('email', '==', req.body.email)
	var getRefUserUsername = docRefUser.where('username', '==', req.body.username)	
	var userId = req.params.id
	var token = req.headers['x-access-token'];
	if (!token) {
		return res.status(401).send({auth: false, message: 'No log-in detected.'})
	} else {
		jwt.verify(token, config.secret, function(err, decoded) {
			if(err) {
				return res.status(500).send({auth: false, message: 'Failed to authenticate token.'})
			}
		})
	}
	async function editProfile() {
		try {
			await getRefUserUsername.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					usernameAda = doc.data().username
				})
			})
			await getRefUserEmail.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					emailAda = doc.data()
				})
			})
			if (usernameAda && emailAda) {
				docRefUser.doc(userId).update({
						fullname: req.body.fullname,
						birthday: req.body.birthday,
						gender: req.body.gender,
					})
			    .then((snapshot) => {
					console.log('user dan email sudah terpakai, coba lagi dengan nama lain')
			    	res.status(400).json({
			    		status: 'user dan email sudah terpakai',
			    		message: 'user dan email sudah terpakai, coba lagi dengan nama lain'
			    	});
			    })
			} else if (usernameAda) {
			    	res.status(400).json({
			    		status: 'failed',
			    		message: 'username telah dipakai, coba username lain'
			    	});
			} else if (emailAda) {
			    	res.status(400).json({
			    		status: 'failed',
			    		message: 'email telah dipakai, coba email lain'
			    	});
			} else {				
				docRefUser.doc(userId).update({
						username: req.body.username,
						fullname: req.body.fullname,
						birthday: req.body.birthday,
						gender: req.body.gender,
						email: req.body.email
					})
			    .then((snapshot) => {
			    	res.status(200).json({
			    		status: 'Success',
			    		message: 'Selamat anda lolos'
			    	});
			    })
			    .catch((err) => {
			      console.log('Error changing user', err);
			    });
			}
		} catch (err) {
			console.log('Opps, an error occured', err)
		}
	}
	editProfile();
});
