const multer = require('multer');
const path   = require('path');

// Setup storage
var storage = multer.diskStorage({
	destination: (req, file, callback) => {
		callback(null, './public/upload');
	},
	filename: (req, file, callback) => {
		callback(null, randomString() + path.extname(file.originalname));
	}
});

// Init upload
var upload = multer({
				storage: storage,
				fileFilter: (req, file, callback) => {
					checkFile(file, callback);
				},
				limits:{
					fileSize: 2000000
				}
			}).single('avatar');

function checkFile(file, callback) {
	const allowedFileTypes = /jpeg|jpg|png|gif/;
	const mimeType  = allowedFileTypes.test(file.mimetype);
	
	if(mimeType){
		return callback(null, true);
	}else{
		callback('error')
	}
}

function randomString() {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var stringLength = 15;
	var randomString = '';
	for (var i=0; i<stringLength; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomString += chars.substring(rnum,rnum+1);
	}

	return randomString;
}

module.exports = upload;