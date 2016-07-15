/*
 *  Drawphone Client
 *  By Tanner Krewson
 */

$('#joinbtn').click(function() {
  //hide the main menu
  $('#mainmenu').addClass('hidden');
  //show the join game menu
  $('#joinmenu').removeClass('hidden');
});

$('#newbtn').click(function() {
  //hide the main menu
  $('#mainmenu').addClass('hidden');
  //show the join game menu
  $('#newmenu').removeClass('hidden');
});

$('#joinmenu-back').click(function() {
  //hide the join game menu
  $('#joinmenu').addClass('hidden');
  //show the main menu
  $('#mainmenu').removeClass('hidden');
});

$('#newmenu-back').click(function() {
  //hide the new game menu
  $('#newmenu').addClass('hidden');
  //show the main menu
  $('#mainmenu').removeClass('hidden');
});
