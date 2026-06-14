// $spotlight = $('#spotlight')

// $(window).on('mousemove', (ev) ->
//   $spotlight.css({
//     left: ev.pageX,
//     top: ev.pageY
//   })
// )


(function() {
  var $spotlight;

  $spotlight = $('#spotlight');

  $(window).on('mousemove', function(ev) {
    return $spotlight.css({
      left: ev.pageX,
      top: ev.pageY
    });
  });

}).call(this);