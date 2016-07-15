/*
 *  Drawphone Client
 *  By Tanner Krewson
 */

//make the url look nice
$( document ).ready(function() {
  window.history.pushState("Drawphone", "Drawphone", "/");
});

$('#joinbtn').click(function() {
  hideAll();
  //show the join game menu
  $('#joinmenu').removeClass('hidden');
});

$('#newbtn').click(function() {
  hideAll();
  //show the new game menu
  $('#newmenu').removeClass('hidden');
});

$('#joinmenu-back').click(function() {
  hideAll();
  //show the main menu
  $('#mainmenu').removeClass('hidden');
});

$('#newmenu-back').click(function() {
  hideAll();
  //show the main menu
  $('#mainmenu').removeClass('hidden');
});

function hideAll() {
  $('#mainmenu').addClass('hidden');
  $('#joinmenu').addClass('hidden');
  $('#newmenu').addClass('hidden');
}

$('#joinmenu-go').click(function() {
  var code = $('#joinincode').val();
  var name = $('#joininname').val();

  if (name.length > 1 && code.length === 4) {
    window.location.replace('/' + code + '?name=' + name);
  }
});

$('#newmenu-go').click(function() {
  var name = $('#newinname').val();

  if (name.length > 1) {
    window.location.replace('/new?name=' + name);
  }
});
