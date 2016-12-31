/**
  Wrapper function for handlers for non-standard events that tells mithril to redraw
  This is needed as mithril doesn't know how to handle non-standard events by default.
  Also useful for any event handlers that need to be manually added/removed
  outside of a mithril view function (e.g. 3rd party library).
**/

// this is based off of mithril's internal 'autoredraw' function
export default function handleWithRedraw(m, callback, opts) {
  var opts = opts || {};
  var isThrottled = !!opts.throttleDelayAmount;
  var isWaitingForRedraw = false;

  var redraw = function() {
    m.endComputation();
    isWaitingForRedraw = false;
  };
  redraw = isThrottled ? throttle(redraw, opts.throttleDelayAmount) : redraw;

  return function(event) {
    if (!isWaitingForRedraw) {
      m.startComputation();
      isWaitingForRedraw = true;
    }
    try {
      return callback.call(this, event);
    } finally {
      redraw();
    }
  };
}

function throttle(fn, delay, scope) {
  var lastCalledAt = null;
  var timerId = null;

  return function() {
    var now = (new Date()).getTime();
    var isFirstCall = !lastCalledAt;
    var isThrottleDelayFinished = !isFirstCall && lastCalledAt + delay < now;
    var context = scope || this;

    if (isFirstCall || isThrottleDelayFinished) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastCalledAt = now;
      fn.apply(context, arguments);
    } else {
      if (!timerId) {
        timerId = setTimeout(function() {
          lastCalledAt = (new Date()).getTime();
          timerId = null;
          fn.apply(context, arguments);
        }, delay - (now - lastCalledAt));
      }
    }
  };
}
