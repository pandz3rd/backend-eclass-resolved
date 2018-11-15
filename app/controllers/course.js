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

const collection_list = {
  instructor: 'dummyInstructor',
  section: 'dummySection',
  video: 'dummyVideo',
  category: 'dummyCategory',
  course: 'dummyCourse'
}
var _instructors = [];
var _videos = [];
var _sections = [];
var _categories = [];
var _courses = [];
var categoryList = [];
var loading = true;

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

getCategory();

function getCategory(){
	getDataFromFirebase(collection_list.category, function(snapshot){
		snapshot.forEach(doc => {
			var obj = {
				id: doc.id,
				categoryName: doc.data().categoryName,
				description: doc.data().description,
				subcategory: doc.data().subcategory
			}
			_categories.push(obj);
			categoryList.push(obj.id)
		})
		getInstructor();
		console.log('LOADING 10%...')
	})
}

function getInstructor(){
	getDataFromFirebase(collection_list.instructor, function(snapshot){
		snapshot.forEach(doc => {
			var obj = {
				id: doc.id,
				name: doc.data().name
			}
			_instructors.push(obj);
		})
		getVideo();
		console.log('LOADING 40%...')
	})
}

function getVideo(){
	getDataFromFirebase(collection_list.video, function(snapshot){
		snapshot.forEach(doc => {
			var obj = {
		        id: doc.id,
		        duration: doc.data().duration,
		        locked: doc.data().locked,
		        sort_video: doc.data().sort_video,
		        title: doc.data().title,
		        url: doc.data().url
		    }
		    _videos.push(obj)
		})
		getSection();
		console.log('LOADING 70%...')
	})
}

function getSection(){
	getDataFromFirebase(collection_list.section, function(snapshot){
		snapshot.forEach(doc => {
			var vids = doc.data().data_video;
			var converted = convertIdsToObjects(vids, _videos)
			var obj = {
		        id: doc.id,
		        data_video: converted,
		        sort_section: doc.data().sort_section,
		        title: doc.data().title
		    }
		    _sections.push(obj)
		})
		console.log('LOADING 90%...')
		console.log('LOADED.')
		loading = false;
	})
}

// Module
function getDataFromFirebase(collection, callback){
	var _collection = db.collection(collection)
	_collection.get().then(snapshot => {
		callback(snapshot);
	})
}

function convertIdsToObjects(arr, arr2){
	for (var i = 0; i < arr.length; i++) {
		for (var j = 0; j < arr2.length; j++) {
			if(arr2[j].id === arr[i]){
				arr[i] = arr2[j];
			}
		}
	}
	return arr
}

function convertIdsToObjectsCat(arr, arr2){
	for (var i = 0; i < arr.length; i++) {
		for (var j = 0; j < arr2.length; j++) {
 			if(arr2[j].id === arr[i].idCat){
				arr[i] = arr2[j];
			}
		}
	}
 	return arr
} 

function filterSelectedCategoryOnly(type, convertedCategory, params){
	var idCategory = params.c;
	var idSubCat = params.s;
	var idTopic = params.t;

    var selectedCategory = null;
    var selectedSubcat = null;
    var selectedTopic = null;

    for (var i = 0; i < convertedCategory.length; i++) {
    	if(convertedCategory[i].id == idCategory){
    		selectedCategory = convertedCategory[i];

    		for (var j = 0; j < selectedCategory.subcategory.length; j++) {
    			if(selectedCategory.subcategory[j].id == idSubCat){
    				selectedSubcat = selectedCategory.subcategory[j];

    				if(type == 'topic'){
	    				for (var k = 0; k < selectedSubcat.topic.length; k++) {
	    					if(selectedSubcat.topic[k].id == idTopic){
	    						selectedTopic = selectedSubcat.topic[k];
	    					}
	    				}
    				}

    			}
    		}
    	}
    }

    convertedCategory = [selectedCategory];
    convertedCategory[0].subcategory = [selectedSubcat];
    if(type == 'topic'){
	    convertedCategory[0].subcategory[0].topic = [selectedTopic];
    }
    return convertedCategory;
}

function checkUpdate(){
  console.log('CHECK DULU DATABASENYA')
}


// GET ALL COURSES
router.get('/v1/courses', (req, res, next) => {
	checkUpdate();

	if(loading){
		console.log('masih loading. silahkan coba beberapa saat lagi')
		res.status(500).json({message: 'masih loading. silahkan coba beberapa saat lagi.'})

	}else{
		var result = [];

		getDataFromFirebase(collection_list.course, function(snapshot){
			snapshot.forEach(doc => {
				var cloned = JSON.parse(JSON.stringify(doc.data()));
		        var convertedCategory = convertIdsToObjectsCat(doc.data().category, _categories);
		        var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
		        var convertedSection = convertIdsToObjects(doc.data().section, _sections);

		        cloned.id = doc.id;
		        cloned.category = convertedCategory;
		        cloned.instructor = convertedInstructor;
		        cloned.section = convertedSection;

		        result.push(cloned)
		    })
		    res.status(200).json({result: result});
		})
	}
});

// GET NEWEST COURSE 
router.get('/v1/newestcourses', (req, res, next) => {
	var result = [];
	var result_sort;

	getDataFromFirebase(collection_list.course, function(snapshot){
		snapshot.forEach(doc => {
			var cloned = JSON.parse(JSON.stringify(doc.data()));
	        var convertedCategory = convertIdsToObjectsCat(doc.data().category, _categories);
	        var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
	        var convertedSection = convertIdsToObjects(doc.data().section, _sections);

	        cloned.id = doc.id;
	        cloned.category = convertedCategory;
	        cloned.instructor = convertedInstructor;
	        cloned.section = convertedSection;

	        result.push(cloned)
	    })

	    result_sort = result.sort(function(x, y) {
	    	return x.created._seconds - y.created._seconds;
	    });

	    if (result_sort.length > 10) {
	    	result_sort.slice(0, 10)
		}
		res.status(200).json({result: result_sort});
    })
})

// GET POPULAR COURSE 
router.get('/v1/popularcourses', (req, res, next) => {
	var result = [];
	var result_sort;

	getDataFromFirebase(collection_list.course, function(snapshot){
		snapshot.forEach(doc => {
			var cloned = JSON.parse(JSON.stringify(doc.data()));
		    var convertedCategory = convertIdsToObjectsCat(doc.data().category, _categories);
		    var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
		    var convertedSection = convertIdsToObjects(doc.data().section, _sections);

		    cloned.id = doc.id;
		    cloned.category = convertedCategory;
		    cloned.instructor = convertedInstructor;
		    cloned.section = convertedSection;

		    result.push(cloned)
		})

		result_sort = result.sort(function(x, y) {
			var Xpopular = x.view_count * x.popular
			var Ypopular = y.view_count * y.popular
			return Ypopular - Xpopular;
		});

		if (result_sort.length > 10) {
			result_sort.slice(0, 10)
		}
		res.status(200).json({result: result_sort});
	})
})

// POST LOGIN ADMIN 
router.post('/v1/login/admin', (req, res, next) => {

	const hashPassword = crypto.createHash('md5').update(req.body.password).digest('hex');
	const reqUser = req.body.username;
	const reqEmail = req.body.email;
	const role = "admin";

	var colRef = db.collection('user').where('role', '==', role);
	colRef.get().then(snapshot => {
		snapshot.forEach(doc => {
			if (doc.data().username == reqUser || doc.data().email == reqEmail) {
				if (doc.data().password == hashPassword) {
					var token = jwt.sign({
						id: doc.id,
					}, config.secret, {
						expiresIn: '48h'
					});

					res.status(200).send({
						message: "Admin log-in",
						idAdmin : doc.id,
						tokenLogin: token
					});
				} else {
					res.status(400).send({
						message: "Wrong Password"
					})
				}
			} else {
				res.status(400).send({
					message: "Admin does not exist"
				});
			}
		});
	})
	.catch(err => {
		console.log('Error getting documents', err);
	});
});

// GET COURSE BY CATEGORY
router.get('/v1/course/category/:idCat', (req, res, next) => {
	var result = [];
	var idCategory;
	getDataFromFirebase(collection_list.course, function(snapshot){
		snapshot.forEach(doc => {
			idCategory = req.params.idCat
			if (idCategory == doc.data().category[0].idCat) {
 				var cloned = JSON.parse(JSON.stringify(doc.data()));
 		        var convertedCategory = convertIdsToObjectsCat(doc.data().category, _categories);
		        var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
		        var convertedSection = convertIdsToObjects(doc.data().section, _sections);
 		        cloned.id = doc.id;
		        cloned.category = convertedCategory;
		        cloned.instructor = convertedInstructor;
		        cloned.section = convertedSection;
	        
	        	result.push(cloned)
			}
        })
        res.status(200).json({result: result});
    })
})

// GET COURSE BY SUBCATEGORY
router.get('/v1/course/category/:idCat/:idSub', (req, res, next) => {
	var result = [];
	var idCategory = req.params.idCat;
	var idSubCat = req.params.idSub;

	var paramsData = {
    	c: idCategory,
    	s: idSubCat,
    	t: null
    }

	console.log('GET COURSE BY SUBCAT: \nCategory: ' + idCategory + ' \nSubcategory: ' + idSubCat);
	
	getDataFromFirebase(collection_list.course, function(snapshot){
		snapshot.forEach(doc => {
			if (idCategory == doc.data().category[0].idCat) {
				console.log('course by category: ada')
 				var cloned = JSON.parse(JSON.stringify(doc.data()));
 		        var convertedCategory = convertIdsToObjectsCat(doc.data().category, _categories);

				if(idSubCat == doc.data().category[0].idSub) {
					console.log('course by subcategory: ada')

			        var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
			        var convertedSection = convertIdsToObjects(doc.data().section, _sections);
	 		        cloned.id = doc.id;
			        cloned.instructor = convertedInstructor;
			        cloned.section = convertedSection;

			        cloned.category = filterSelectedCategoryOnly(false, convertedCategory, paramsData);;
		        
		        	result.push(cloned)
				}
			}
        })
        if(result.length === 0){
        	console.log('400 | COURSE BY SUBCATEGORY NOT SENT.')
	        res.status(400).json({result: result, message: 'Course not found.'});
        }else{
	        console.log('200 | COURSE BY SUBCATEGORY SENT.')
	        res.status(200).json({result: result});
        }
    })
})

// GET COURSE BY TOPIC
router.get('/v1/course/category/:idCat/:idSub/:idTop', (req, res, next) => {
	var result = [];
	var idCategory = req.params.idCat;
	var idSubCat = req.params.idSub;
	var idTopic = req.params.idTop;

	var paramsData = {
    	c: idCategory,
    	s: idSubCat,
    	t: idTopic
    }

	getDataFromFirebase(collection_list.course, function(snapshot){
		snapshot.forEach(doc => {
			if (idCategory == doc.data().category[0].idCat) {
				console.log('course by category: ada')
 				var cloned = JSON.parse(JSON.stringify(doc.data()));
 		        var convertedCategory = convertIdsToObjectsCat(doc.data().category, _categories);

				if(idSubCat == doc.data().category[0].idSub) {
					console.log('course by subcategory: ada')

					if(idTopic == doc.data().category[0].idTop){
						console.log('course by topic: ada')

				        var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
				        var convertedSection = convertIdsToObjects(doc.data().section, _sections);

		 		        cloned.id = doc.id;
				        cloned.instructor = convertedInstructor;
				        cloned.section = convertedSection;
				        cloned.category = filterSelectedCategoryOnly('topic', convertedCategory, paramsData);

			        	result.push(cloned)
					}
				}
			}
        })
        if(result.length === 0){
        	console.log('400 | COURSE BY TOPIC NOT SENT.')
	        res.status(400).json({result: result, message: 'Course not found.'});
        }else{
	        console.log('200 | COURSE BY TOPIC SENT.')
	        res.status(200).json({result: result});
        }
    })
})

// TOP CATEGORY
router.get('/v1/course/topcategory', (req, res, next) => {
	var result = [];
	var topCategory = [];
	var allViewer = 0;
	var dataId;
	var result_sort;
 	getDataFromFirebase(collection_list.course, function(snapshot){
		categoryList.map(cat => {
			var dataCourse = [];
			snapshot.forEach(doc => {
				var cloned = JSON.parse(JSON.stringify(doc.data()));
 		        var convertedCategory = convertIdsToObjectsCat(doc.data().category, _categories);
		        var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
		        var convertedSection = convertIdsToObjects(doc.data().section, _sections);

 		        cloned.id = doc.id;
		        cloned.category = convertedCategory;
		        cloned.instructor = convertedInstructor;
		        cloned.section = convertedSection;
	        			
	        	if (cat == cloned.category[0].id) {
	        		dataCourse.push(cloned);
	        		allViewer = allViewer + cloned.view_count;
	        		dataId = cloned.category[0].id;
	        	}
	        })
	        var dataCategory = {
	        	id: dataId,
	        	view: allViewer,
	        	courses: dataCourse
	        }
 	        topCategory.push(dataCategory)
		})
         result_sort = topCategory.sort(function(x, y) {
			var Xpopular = x.view 
			var Ypopular = y.view
			return Ypopular - Xpopular;
		});
        res.status(200).json({result: result_sort});
    })
})

// GET COURSE BY ID 
router.get('/v1/course/:id', (req, res, next) => {
    var clone_id = null;
    var prev_count = null;
    var result = [];
    var course_id = req.params.id;
    getDataFromFirebase(collection_list.course, function(snapshot){
    snapshot.forEach(doc => {
      if(doc.id === course_id){
        var cloned = JSON.parse(JSON.stringify(doc.data()));
        var convertedCategory = convertIdsToObjects(doc.data().category, _categories);
        var convertedInstructor = convertIdsToObjects(doc.data().instructor, _instructors);
        var convertedSection = convertIdsToObjects(doc.data().section, _sections);
        cloned.id = doc.id;
        clone_id = doc.id;
        prev_count = doc.data().view_count;
        cloned.category = convertedCategory;
        cloned.instructor = convertedInstructor;
        cloned.section = convertedSection;
        result.push(cloned)
        // Update view count 
        var newCount = prev_count + 1;
        db.collection(collection_list.course).doc(clone_id).update({
            view_count: newCount
        })
      }
    })    
    res.status(200).json({
        result: result[0]});
    })
});

// GET USERS LIST 
router.get('/v1/users', (req, res, next) => {
	const docRefUser = db.collection('user');
    var allUsers = [];
    docRefUser.get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            allUsers.push({
                docID: doc.id,
                userData: {
                    fullname : doc.data().fullname,
                    username : doc.data().username,
                    email : doc.data().email,
                    fullname : doc.data().fullname,
                    active: doc.data().active
                }
            })
        })
        console.log('Getting data users')
        res.status(200).json({
            status: 'Ok',
            message : 'User found',
            usersData: allUsers
        })  
    })
    .catch((err) => {
        console.log('Error getting files')
    })
});