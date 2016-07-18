module.exports = function(app) {

  var dp = app.drawphone;

  app.get('/', function(req, res) {
    res.render('index');
  });

  app.get('/dev', function(req, res) {
    res.render('index');
  });

}
