/*
 *  Drawphone Client
 *  By Tanner Krewson
 */

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
