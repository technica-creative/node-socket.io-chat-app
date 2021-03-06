var socket = io(); // initiate a websocket and keep it open

/*
 * Add autoscrolling to bottom of chat window
 */
function scrollToBottom () {
  // selectors
  var messages = jQuery('#messages');
  var newMessage = messages.children('li:last-child');
  // heights
  var clientHeight = messages.prop('clientHeight');
  var scrollTop = messages.prop('scrollTop');
  var scrollHeight = messages.prop('scrollHeight');
  var newMessageHeight = newMessage.innerHeight();
  var lastMessageHeight = newMessage.prev().innerHeight();

  if (clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight) {
    messages.scrollTop(scrollHeight);
  }
}

// ES6 is only supported by Chrome at this time, so we cannot
// use the arrow function on client side: socket.on('connect', () => {})
socket.on('connect', function () {
  // dont emit the events until we are connected
  var params = jQuery.deparam(window.location.search);

  // 3rd param is acknowledgement
  socket.emit('join', params, function (err) {
    if (err) {
      alert(err); // display module here from bootstrap
      window.location.href = '/'; // redirect user back to / page
    } else {
      console.log('No error');
    }
  });
});

socket.on('disconnect', function () {
  console.log('Disconnected from server.');
});

socket.on('updateUserList', function (users) {
  var ol = jQuery('<ol></ol>');

  users.forEach(function (user) {
    ol.append(jQuery('<li></li>').text(user));
  });

  // completely wipe the list and put new version
  jQuery('#users').html(ol);
});

// listen for chat message and display to screen
socket.on('newMessage', function (message) {
  var formattedTime = moment(message.createAt).format('h:mm a');
  var template = jQuery('#message-template').html();

  // send the message.text to the Mustache {{text}} on the index.html page
  var html = Mustache.render(template, {
    text: message.text,
    from: message.from,
    createdAt: formattedTime
  });

  jQuery('#messages').append(html);
  scrollToBottom();
});

// listen for the Send Location button GeoLocation message
socket.on('newLocationMessage', function(message) {
  var formattedTime = moment(message.createdAt).format('h:mm a');
  var template = jQuery('#location-message-template').html();

  // send the url to Mustache {{url}}
  var html = Mustache.render(template, {
    from: message.from,
    url: message.url,
    createdAt: formattedTime
  });

  jQuery('#messages').append(html);
  scrollToBottom();
})


// overriding the default form submit behavior that causes
// the page to refresh. we intercept the submit event here
jQuery('#message-form').on('submit', function (event) {
  event.preventDefault(); // prevents submit event page refresh

  var messageTextbox = jQuery('[name=message]');

  socket.emit('createMessage', {
    from: 'User',
    text: messageTextbox.val()
  }, function () { // acknowledgement
    // clears out the text field after sent
    messageTextbox.val('');
  })
});

// saves expensive task of fetching DOM. Only once done here
var locationButton = jQuery('#send-location');

// uses GeoLocation api
locationButton.on('click', function (event) {
  event.preventDefault(); // prevents submit event page refresh
  // non-supported browsers
  if(!navigator.geolocation) {
    return alert('Geolocation not supported by your browser.');
  }
  // only disable while the process is occuring
  locationButton.attr('disabled', 'disabled').text('Sending location...');

  navigator.geolocation.getCurrentPosition(function(position) {
    // re-enable the button after the position is fetched
    locationButton.removeAttr('disabled').text('Send location');
    socket.emit('createLocationMessage', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    });
  }, function() {
    // displayed if someone prompted to share location but they click Deny
    alert('Unable to fetch location.');

    // re-enable the button if user denys or other reason
    locationButton.removeAttr('disabled').text('Send location');
  })
});
