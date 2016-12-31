function getOrUndefined(v, k) {
  return typeof(v) !== "undefined" && v.hasOwnProperty(k) ? v[k] : undefined;
}

function VideoPlayer(el, options) {
  scrollPos = {x:0, y:0}
  this._el = el;
  this._wrapper;
  this._container;
  this._statusbar = {};
  this._playbtn = {};
  this._progress = {};
  this._fullscreen_btn = {};

  this.autoplay = getOrUndefined(options, 'autoplay') || false;
  this.isFullscreen = false;
  this.fullscreen = {};

  this.init = function() {
    this._el.removeAttr('controls');
    this._wrapper = $('<div id="yvp-wr"/>');
    this._container = $('<div class="yvp-container"/>');
    this._statusbar.el = $('<div class="yvp-statusbar"/>');
    this._progress.wr = $('<div class="yvp-progress-wr"/>');

    this._el.addClass('yvp-video');
    this._container.insertBefore(this._el).append(this._el);
    this._wrapper.insertBefore(this._container).append(this._container);
    this._container.append(this._statusbar.el);


    this._init_play_btn();

    this._statusbar.el.append(this._progress.wr);

    this._init_fullscreen();
    this.fullscreen = _fullscreen();

    if(this.autoplay) {
      this.play();
    }
  }

  this._saveScrollPosition = function() {
      scrollPos = {
          x: window.pageXOffset || 0,
          y: window.pageYOffset || 0
      };
  }

  this._toggleFullscreen = function() {
    var nativeSupport = this.fullscreen.supportsFullScreen;
    if (nativeSupport) {
        // If it's a fullscreen change event, update the UI
        if (event && event.type === this.fullscreen.fullScreenEventName) {
            this.isFullscreen = this.fullscreen.isFullScreen(this._el[0]);
        } else {
            // Else it's a user request to enter or exit
            if (!this.fullscreen.isFullScreen(this._wrapper[0])) {
                // Save scroll position
                this._saveScrollPosition();

                // Request full screen
                this.fullscreen.requestFullScreen(this._wrapper[0]);
            } else {
                // Bail from fullscreen
                this.fullscreen.cancelFullScreen();
            }

            // Check if we're actually full screen (it could fail)
            this.isFullscreen = this.fullscreen.isFullScreen(this._el[0]);

            return;
        }
    } else {
        // Otherwise, it's a simple toggle
        this.isFullscreen = !this.isFullscreen;

        // Bind/unbind escape key
        // document.body.style.overflow = this.isFullscreen ? 'hidden' : '';
    }
  }

  this.play = function() {
    var self = this;
    this._el[0].play().then(function() {
      self._playbtn.showPause();
    }).catch(function(error) {});
  }

  this.pause = function() {
    this._el[0].pause();
    this._playbtn.showPlay();
  }

  this.playPause = function() {
    if (this.isPaused() || this.ended()) {
      this.play();
    } else {
      this.pause();
    }
  }
  
  // Init Specific
  this._init_play_btn = function() {
    var self = this;

    this._playbtn.el = $('<div class="yvp-playbtn"/>');
    
    this._playbtn.childs = {}
    this._playbtn.childs.icon = $('<div class="yvp-playbtn-play fa"/>');

    this._playbtn.childs.icon.appendTo(this._playbtn.el);

    this._statusbar.el.append(this._playbtn.el);
    this._playbtn.el.click(function() {
      self.playPause();
    });
  }

  this._init_fullscreen = function() {
    var self = this;

    this._fullscreen_btn.el = $('<div class="yvp-fsbtn fa fa-arrows-alt"/>');
    this._statusbar.el.append(this._fullscreen_btn.el);
    this._fullscreen_btn.el.click(function() {
      self._toggleFullscreen();
    });
  }

  this._playbtn.showPause = function() {
      this.childs.icon.removeClass('yvp-playbtn-play').addClass('yvp-playbtn-pause');
  }

  this._playbtn.showPlay = function() {
      this.childs.icon.removeClass('yvp-playbtn-pause').addClass('yvp-playbtn-play');
  }

  // MediaElement Specific
  this.isPaused = function() {
    return this._el[0].paused;
  }

  this.ended = function() {
    return this._el[0].ended;
  }
}

// Check variable types
var _is = {
    object: function(input) {
        return input !== null && typeof(input) === 'object';
    },
    array: function(input) {
        return input !== null && (typeof(input) === 'object' && input.constructor === Array);
    },
    number: function(input) {
        return input !== null && (typeof(input) === 'number' && !isNaN(input - 0) || (typeof input === 'object' && input.constructor === Number));
    },
    string: function(input) {
        return input !== null && (typeof input === 'string' || (typeof input === 'object' && input.constructor === String));
    },
    boolean: function(input) {
        return input !== null && typeof input === 'boolean';
    },
    nodeList: function(input) {
        return input !== null && input instanceof NodeList;
    },
    htmlElement: function(input) {
        return input !== null && input instanceof HTMLElement;
    },
    function: function(input) {
        return input !== null && typeof input === 'function';
    },
    undefined: function(input) {
        return input !== null && typeof input === 'undefined';
    }
};

function _fullscreen() {
    var fullscreen = {
        supportsFullScreen: false,
        isFullScreen: function() { return false; },
        requestFullScreen: function() {},
        cancelFullScreen: function() {},
        fullScreenEventName: '',
        element: null,
        prefix: ''
    },
    browserPrefixes = 'webkit o moz ms khtml'.split(' ');

    // Check for native support
    if (!_is.undefined(document.cancelFullScreen)) {
        fullscreen.supportsFullScreen = true;
    } else {
        // Check for fullscreen support by vendor prefix
        for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
            fullscreen.prefix = browserPrefixes[i];

            if (!_is.undefined(document[fullscreen.prefix + 'CancelFullScreen'])) {
                fullscreen.supportsFullScreen = true;
                break;
            } else if (!_is.undefined(document.msExitFullscreen) && document.msFullscreenEnabled) {
                // Special case for MS (when isn't it?)
                fullscreen.prefix = 'ms';
                fullscreen.supportsFullScreen = true;
                break;
            }
        }
    }

    // Update methods to do something useful
    if (fullscreen.supportsFullScreen) {
        // Yet again Microsoft awesomeness,
        // Sometimes the prefix is 'ms', sometimes 'MS' to keep you on your toes
        fullscreen.fullScreenEventName = (fullscreen.prefix === 'ms' ? 'MSFullscreenChange' : fullscreen.prefix + 'fullscreenchange');

        fullscreen.isFullScreen = function(element) {
            if (_is.undefined(element)) {
                element = document.body;
            }
            switch (this.prefix) {
                case '':
                    return document.fullscreenElement === element;
                case 'moz':
                    return document.mozFullScreenElement === element;
                default:
                    return document[this.prefix + 'FullscreenElement'] === element;
            }
        };
        fullscreen.requestFullScreen = function(element) {
            if (_is.undefined(element)) {
                element = document.body;
            }
            return (this.prefix === '') ? element.requestFullScreen() : element[this.prefix + (this.prefix === 'ms' ? 'RequestFullscreen' : 'RequestFullScreen')]();
        };
        fullscreen.cancelFullScreen = function() {
            return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + (this.prefix === 'ms' ? 'ExitFullscreen' : 'CancelFullScreen')]();
        };
        fullscreen.element = function() {
            return (this.prefix === '') ? document.fullscreenElement : document[this.prefix + 'FullscreenElement'];
        };
    }

    return fullscreen;
}

function vp(selector, options) {
  var el = $("#" + selector);
  player = new VideoPlayer(el, options);

  // TODO: Re-enable this
  player.init();

  return player;
}
