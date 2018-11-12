const firebaseAdmin = require('firebase-admin');
const db = firebaseAdmin.firestore()
const settings = {/* your settings... */ timestampsInSnapshots: true};
db.settings(settings);

User = {
	getAll: function(callback){
		var users = []
		db.collection('users').get()
	    .then((snapshot) => {
	      snapshot.forEach((doc) => {
	        users.push(doc.data())
	      });
	      callback(users)
	    })
	    .catch((err) => {
	      console.log('Error getting documents', err);
	    });	
	}
}

module.exports = User;