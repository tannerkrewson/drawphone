module.exports = function(app) {

  var dp = app.drawphone;

  app.get('/', function(req, res) {
    res.render('index');
  });

  app.get('/new', function(req, res) {
    var name = req.query.name;
    if (name) {
      var game = dp.newGame();
      res.redirect('/' + game.code + '?name=' + name);
    }
  });

  app.get('/:code', function(req, res) {
    var code = req.params.code;
    var name = req.query.name;
    var game = dp.findGame(code);
    if (game && name) {
      game.addPlayer(name);
      res.render('lobby', {
        code: game.code.toUpperCase(),
        players: game.players
      });
    } else {
      res.redirect('/');
    }
  });

}
