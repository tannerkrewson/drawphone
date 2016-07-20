module.exports = function(app) {

  var dp = app.drawphone;

  app.get('/', function(req, res) {
    res.render('index');
  });

  if (app.get('env') === 'development') {
    app.get('/dev', function(req, res) {
      res.render('index');
    });
  }
}
