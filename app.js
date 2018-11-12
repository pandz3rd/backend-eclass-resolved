const express = require('express');
const config = require('./config/config');
const glob = require('glob');
const cors = require('cors');

const models = glob.sync(config.root + '/app/models.js');
models.forEach(function (model) {
  require(model);
});

const app = express();
app.use(cors());

module.exports = require('./config/express')(app, config);

app.listen(config.port, () => {
  console.log('Express server listening on port ' + config.port);
});
