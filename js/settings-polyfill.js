(function(exports) {
  /**
   * This is an reimplementation of EventTarget in JavaScript,
   * usable as a mock for tests, and creating interfaces that inherits
   * from MockEventTarget.
   *
   * @class MockEventTarget
   */
  var MockEventTarget = function MockEventTarget() {
  };

  /**
   * Adding an event listener for the success/error event.
   * @memberof MockEventTarget.prototype
   * @param {String}          type     Event type, success or error.
   * @param {Function|Object} handler  Event handler.
   * @param {Boolean}         capture  True if use capture mode.
   */
  MockEventTarget.prototype.addEventListener =
    function(type, handler, capture) {
      if (typeof handler !== 'function' && handler &&
          typeof handler.handleEvent !== 'function') {
        return;
      }

      var eventCallbacks;
      if (capture) {
        eventCallbacks = this._captureCallbacks = this._captureCallbacks || {};
      } else {
        eventCallbacks = this._bubbleCallbacks = this._bubbleCallbacks || {};
      }

      eventCallbacks[type] = eventCallbacks[type] || [];
      // the same handler should not be added twice.
      if (eventCallbacks[type].indexOf(handler) !== -1) {
        return;
      }

      eventCallbacks[type].push(handler);
    };

  /**
   * Remove an event listener for the success/error event.
   * @memberof MockEventTarget.prototype
   * @param {String}          type     Event type, success or error.
   * @param {Function|Object} handler  Event handler.
   * @param {Boolean}         capture  True if use capture mode.
   */
  MockEventTarget.prototype.removeEventListener = function(type, handler,
                                                          capture) {
    if (typeof handler !== 'function' && handler &&
        typeof handler.handleEvent !== 'function') {
      return;
    }

    var eventCallbacks;
    if (capture) {
      eventCallbacks = this._captureCallbacks = this._captureCallbacks || {};
    } else {
      eventCallbacks = this._bubbleCallbacks = this._bubbleCallbacks || {};
    }

    var callbacks = eventCallbacks[type] || [];
    var index = callbacks.indexOf(handler);

    if (index === -1) {
      return;
    }

    callbacks.splice(index, 1);
  };

  /**
   * Dispatch event.
   * @memberof MockEventTarget.prototype
   * @param  {object} event Mocked event to dispatch (`type` is required).
   */
  MockEventTarget.prototype.dispatchEvent = function(evt) {
    var type = evt.type;

    this._captureCallbacks = this._captureCallbacks || {};
    this._bubbleCallbacks = this._bubbleCallbacks || {};

    var captureCallbacks = this._captureCallbacks[type] || [];
    var bubbleCallbacks = this._bubbleCallbacks[type] || [];

    // Don't overwrite evt.target if it is assigned already.
    // Sometimes we want to simulate event bubbling/capturing in the DOM tree
    // even though this is not how this mock behaves.
    if (!evt.target) {
      evt.target = this;
    }
    evt.currentTarget = this;

    captureCallbacks.forEach(function fireCaptureEvents(handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }
    }, this);

    if (('on' + evt.type) in this &&
        typeof this['on' + evt.type] === 'function') {
      this['on' + evt.type](evt);
    }

    bubbleCallbacks.forEach(function fireCaptureEvents(handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }
    }, this);
  };

  exports.MockEventTarget = MockEventTarget;
}(window));

(function(exports) {

/**
 *
 * This is a mock of navigator.mozSettings
 * See
 * https://mxr.mozilla.org/mozilla-central/source/dom/settings/SettingsManager.js
 * for the platform implementation.
 *
 * Please use sinon.spy or sinon.stub to wrap these functions to do your things.
 *
 * Require MockEventTarget and MockDOMRequest.
 *
 */
var MockNavigatorMozSettings = function() {
  this._callbacks = {};
};

MockNavigatorMozSettings.prototype = new MockEventTarget();

MockNavigatorMozSettings.prototype.onsettingchange = null;

// This function returns a mocked lock object.
// to spy/stub the methods of the returned lock before this method is called,
// stub this method and return your own lock with spy/stub methods.
MockNavigatorMozSettings.prototype.createLock = function() {
  var lock = new MockNavigatorMozSettingsLock(this);

  return lock;
};

MockNavigatorMozSettings.prototype.addObserver = function(key, callback) {
  if (!this._callbacks[key]) {
    this._callbacks[key] = [callback];
  } else {
    this._callbacks[key].push(callback);
  }
};

MockNavigatorMozSettings.prototype.removeObserver = function(key, callback) {
  if (this._callbacks[key]) {
    var index = this._callbacks[key].indexOf(callback);
    if (index !== -1) {
      this._callbacks[key].splice(index, 1);
    }
  }
};

MockNavigatorMozSettings.prototype.dispatchSettingChange = function(key, val) {
  var evt = {
    type: 'settingchange',
    settingName: key,
    settingValue: val
  };
  this.dispatchEvent(evt);

  if (this._callbacks && this._callbacks[key]) {
    this._callbacks[key].forEach(function(cb) {
      cb({ settingName: key, settingValue: val });
    }.bind(this));
  }
};

var MockNavigatorMozSettingsLock = function(parent) {
  this.closed = false;
  this.parent = parent;
};

MockNavigatorMozSettingsLock.prototype.set = function(arg) {
  var req = {};
  
  Object.keys(arg).forEach(function(k) {
    localStorage.setItem(k, JSON.stringify(arg[k]));
  });
  
  setTimeout(function() {
    req.onsuccess && req.onsuccess();
  });
  
  return req;
};

MockNavigatorMozSettingsLock.prototype.get = function(arg) {
  var req = {};
  
  var item = localStorage.getItem(arg);
  if (item) {
    item = JSON.parse(item);
  }
  setTimeout(function() {
    var ret = {};
    ret[arg] = item;
    req.result = ret;
    req.onsuccess && req.onsuccess({ result: ret });
  });

  return req;
};

exports.MockNavigatorMozSettings = MockNavigatorMozSettings;
exports.MockNavigatorMozSettingsLock = MockNavigatorMozSettingsLock;

navigator.mozSettings2 = new MockNavigatorMozSettings();

})(window);
