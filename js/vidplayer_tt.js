(function(win, $) {
  var defaults = {
    clsnames: {
      mainwrapper: "yvp-wr",
      playercontainer: "yvp-container",
      videotag: "yvp-video",
      controlbar: "yvp-controlbar",
      progressbarwr: "yvp-progress-wr",
      playbtn: "yvp-playbtn",
      playicon: "yvp-playbtn-play fa",
      fullscreenbtn: "yvp-fsbtn fa fa-arrows-alt",
    },
    init: [
      {
        name: 'playercontainer',
        type: PlayerContainer,
        args: ['this', 'class-playercontainer'],
        dom: {
          type: 'wrapAround',
          target: '_player'},
        callMethod: {
          method: 'init',
          args: ['this']},
      },
      {
        name: 'controlbar',
        type: ControlBar,
        args: ['this', 'class-controlbar'],
        dom: {
          type: 'appendTo',
          target: 'playercontainer'},
        callMethod: {
          method: 'init',
          args: ['this']},
      },
      {
        name: 'mainwrapper',
        type: MainWrapper,
        args: ['this', 'class-mainwrapper'],
        dom: {
          type: 'wrapAround',
          target: 'playercontainer'},
        callMethod: {
          method: 'init',
          args: ['this']}
      },
    ]
  }


  function yvp(el, options) {
    this._player;
    this._elements = {}
    this._eventlist = [];

    function init(id) {
      el = $('#' + id);

      // Init Specific
      function _init_videotag(el) {
        this._player = new PlayerElement(this, el);
        this._player.toggleDefaultControls();
        this._player.addClass(defaults.clsnames.videotag);
      }

      function _initArgs(obj, args, first) {
        var new_args = [];
        if(!first) {
          new_args.unshift(null);
        }
        for(var i in args) {
          if(args[i] === 'this') {
            new_args.push(obj);
          } else if(args[i].startsWith('class-')) {
            var clsname = args[i].split('-')[1];
            new_args.push(defaults.clsnames[clsname]);
          }
        }
        return new_args;
      }

      function _doInitialize() {
        for(var i in defaults.init) {
          var data = defaults.init[i];
          var obj = new (Function.prototype.bind.apply(
                         data.type, _initArgs(this, data.args)));
          var dom = data.dom;
          var target = (dom.target === '_player')
            ? this._player : this.getElement(dom.target);
          obj[dom.type](target);
          if(data.hasOwnProperty('callMethod')) {
            var methodargs = _initArgs(this, data.callMethod.args, true);
            obj[data.callMethod.method].apply(obj, methodargs);
          }
          this.addElement(obj, data.name);
        }
      }
 
      _init_videotag(el);
      _doInitialize();
    }

    this.addEvent = function(type, cb) {
      if(!this._eventlist[type]) {
        this._eventlist[type] = [];
      }

      if(this._eventlist[type].indexOf(cb) === -1) {
        this._eventlist[type].push(cb);
      }
    }

    this.dispatchEvent = function(e) {
      var list = this._eventlist[e.type];
      if(list) {
        if(!e.target) {
          e.target = this;
        }
        for(var i in list) {
          list[i](e);
        }
      }
    }

    this.addElement = function(obj, name) {
      this._elements[name] = obj;
    }

    this.getElement = function(name) {
      return this._elements[name];
    }

    this.toggleFullscreen = function() {
      this._elements['mainwrapper'].toggleFullscreen();
    }

    init(el);
  }

  // The main video element
  function PlayerElement(yvp, el) {
    this._el = el;
    this._yvp = yvp;

    this.init = function() {
      this._yvp.addEvent('playPause', this.playPause.bind(this));
    }

    this.toggleDefaultControls = function(show) {
        this[show ? 'addAttr' : 'removeAttr']('controls');
    }

    this.play = function() {
      this.element()[0].play().then(function() {
        // Now the video is playing so we can set the play icon to pause
        this._yvp.dispatchEvent({type: 'playpromise', target:this}); 
      }.bind(this)).catch(function(error) {});
    }

    this.pause = function() {
      this.element()[0].pause();
      // Now the video is paused so we can set the pause icon to play
      this._yvp.dispatchEvent({type: 'pause', target:this});
    }

    this.paused = function() {
      return this.element()[0].paused;
    }

    this.ended = function() {
      return this.element()[0].ended;
    }

    this.playPause = function() {
      if (this.paused() || this.ended()) {
        this.play();
      } else {
        this.pause();
      }
    }

    this.init();
  };

  function Container(yvp, clsname) {
    this._yvp = yvp;
    this._el = $('<div class="'+clsname+'"/>');

    this.addEvent = function() {
      return this._yvp.addEvent.apply(null, arguments);
    }

    this.dispatchEvent = function() {
      return this._yvp.dispatchEvent.apply(null, arguments);
    }
  }

  function PlayerContainer() {
    inherit(this, Container, arguments);
    
    this.init = function() {
      this.addEvent('enterFullscreen', this._enterFullscreen.bind(this));
      this.addEvent('exitFullscreen', this._exitFullscreen.bind(this));
    }

    this._enterFullscreen = function() {
      this.element().addClass('yvp-fullscreen');
    }

    this._exitFullscreen = function() {
      this.element().removeClass('yvp-fullscreen');
    }
  }

  function ControlBar() {
    inherit(this, Container, arguments);
    this._playbtn;
    this._fsbtn;

    this.init = function() {
      this._playbtn = new PlayBtn(this._yvp, defaults.clsnames.playbtn);
      this._playbtn.appendTo(this).init();

      this._fsbtn = new FullScreenBtn(this._yvp, defaults.clsnames.fullscreenbtn);
      this._fsbtn.appendTo(this).init();
    }
  }

  function FullScreenBtn() {
    inherit(this, Container, arguments);

    this.init = function() {
      this.element().click(function() {
        this.dispatchEvent({type: "toggleFullscreen"});
      }.bind(this));
    }
  }

  function PlayBtn() {
    inherit(this, Container, arguments);
    this._icon;

    this.init = function() {
      this._icon = new Container(this._yvp, defaults.clsnames.playicon);
      this._icon.appendTo(this);

      this.addEvent('playpromise', this.showPause.bind(this));
      this.addEvent('pause', this.showPlay.bind(this));

      this.element().click(function() {
        this.dispatchEvent({type:'playPause'});
      }.bind(this));
    }

    this.showPause = function() {
        this._icon.removeClass('yvp-playbtn-play').addClass('yvp-playbtn-pause');
    }

    this.showPlay = function() {
        this._icon.removeClass('yvp-playbtn-pause').addClass('yvp-playbtn-play');
    }
  }

  // Gotta wrap 'em all
  function MainWrapper() {
    inherit(this, Container, arguments);
    this.fullscreen = _fullscreen();

    this.init = function() {
      this.addEvent('toggleFullscreen', this.toggleFullscreen.bind(this));
    }

    function _fullscreen() {
      var fullscreen = {
          supportsFullScreen: false,
          isFullScreen: function() {
            return false;
          },
          requestFullScreen: function() {},
          cancelFullScreen: function() {},
          fullScreenEventName: '',
          element: null,
          prefix: ''
        },
        browserPrefixes = 'webkit o moz ms khtml'.split(' ');

      // Check for native support
      if (!isundefined(document.cancelFullScreen)) {
        fullscreen.supportsFullScreen = true;
      } else {
        // Check for fullscreen support by vendor prefix
        for (var i = 0, il = browserPrefixes.length; i < il; i++) {
          fullscreen.prefix = browserPrefixes[i];

          if (!isundefined(document[fullscreen.prefix + 'CancelFullScreen'])) {
            fullscreen.supportsFullScreen = true;
            break;
          } else if (!isundefined(document.msExitFullscreen) &&
            document.msFullscreenEnabled) {
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
        fullscreen.fullScreenEventName = (fullscreen.prefix === 'ms' ?
          'MSFullscreenChange' : fullscreen.prefix + 'fullscreenchange');

        fullscreen.isFullScreen = function(element) {
          if (isundefined(element)) {
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
          if (isundefined(element)) {
            element = document.body;
          }
          return (this.prefix === '') ?
            element.requestFullScreen() :
            element[this.prefix +
              (this.prefix === 'ms' ? 'RequestFullscreen' : 'RequestFullScreen')]();
        };
        fullscreen.cancelFullScreen = function() {
          return (this.prefix === '') ?
            document.cancelFullScreen() :
            document[this.prefix +
              (this.prefix === 'ms' ? 'ExitFullscreen' : 'CancelFullScreen')]();
        };
        fullscreen.element = function() {
          return (this.prefix === '') ?
            document.fullscreenElement :
            document[this.prefix + 'FullscreenElement'];
        };
      }

      return fullscreen;
    }

    this.toggleFullscreen = function() {
      if (this.fullscreen.supportsFullScreen) {
        // If it's a fullscreen change event, update the UI
        if (event && event.type === this.fullscreen.fullScreenEventName) {
          this.isFullscreen = this.fullscreen.isFullScreen(this.element()[0]);
        } else {
          // Else it's a user request to enter or exit
          if (!this.fullscreen.isFullScreen(this.element()[0])) {

            // Request full screen
            this.fullscreen.requestFullScreen(this.element()[0]);
            this.dispatchEvent({type: "enterFullscreen"});
          } else {
            // Bail from fullscreen
            this.fullscreen.cancelFullScreen();
            this.dispatchEvent({type: "exitFullscreen"});
          }

          // Check if we're actually full screen (it could fail)
          this.isFullscreen = this.fullscreen.isFullScreen(this.element()[0]);

          return;
        }
      } else {
        // Otherwise, it's a simple toggle
        this.isFullscreen = !this.isFullscreen;

        // Bind/unbind escape key
        // document.body.style.overflow = this.isFullscreen ? 'hidden' : '';
      }
    }
  }

  // Helpers
  function argstoarray(args) {
    args = [].slice.call(args);
    args.unshift(null);
    return args;
  }

  function inherit(obj, src, args) {
    args = argstoarray(args);
    var srcobj = new (Function.prototype.bind.apply(src, args));
    for(var attr in srcobj) {
      if(!src.prototype.hasOwnProperty(attr)) {
        obj[attr] = srcobj[attr];
      }
    }
  }

  function isundefined(input) {
    return input !== null && typeof input === 'undefined';
  }

  function DOMManipulationFacade(src) {
    src.prototype.element = function() {
      return this._el;
    }
    src.prototype.append = function(obj) {
      this.element().append(obj.element());
      return this;
    }
    src.prototype.appendTo = function(obj) {
      this.element().appendTo(obj.element());
      return this;
    }
    src.prototype.insertBefore = function(obj) {
      this.element().insertBefore(obj.element());
      return this;
    }
    src.prototype.wrapAround = function(obj) {
      this.insertBefore(obj).append(obj);
      return this;
    }
    src.prototype.addAttr = function(attr, val) {
      this.element().addAttr(attr, val);
      return this;
    }
    src.prototype.removeAttr = function(attr) {
      this.element().removeAttr(attr);
      return this;
    }
    src.prototype.addClass = function(clsname) {
      this.element().addClass(clsname);
      return this;
    }
    src.prototype.removeClass = function(clsname) {
      this.element().removeClass(clsname);
      return this;
    }
  }

  DOMManipulationFacade(Container);
  DOMManipulationFacade(ControlBar);
  DOMManipulationFacade(MainWrapper);
  DOMManipulationFacade(PlayerElement);
  DOMManipulationFacade(PlayBtn);
  DOMManipulationFacade(FullScreenBtn);
  DOMManipulationFacade(PlayerContainer);

  win.vp = yvp;
})(window, jQuery)

/*
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
      self._playbtn.showPause()
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

function vp(selector, options) {
  var el = $("#" + selector);
  player = new VideoPlayer(el, options);

  // TODO: Re-enable this
  player.init();

  return player;
}
*/
