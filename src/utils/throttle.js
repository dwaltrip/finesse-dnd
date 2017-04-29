import { assert } from './core';

export default function throttle(fn, delay, scope) {
  var lastCalledAt = null;
  var timerId = null;

  assert(delay, 'throttle requires a second argument specifying the `delay` in milliseconds');

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
