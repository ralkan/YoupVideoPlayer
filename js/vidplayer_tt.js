(function(win, $) {
  var defaults = {
    clsnames: {
      mainwrapper: "yvp-wr",
      playercontainer: "yvp-container",
      videotag: "yvp-video",
      controlbar: "yvp-controlbar",

      // ControlBar Specific
      playbtn: "yvp-playbtn",
      playicon: "yvp-playbtn-play fa",
      fullscreenbtn: "yvp-fsbtn fa fa-arrows-alt",
      progressctrl: "yvp-progressctrl",
      progressholder: "yvp-progressholder",
      playprogress: "yvp-playprogress",
      progresstime: "yvp-progresstime",
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
    return new YVideoPlayer(el, options);
  }

  function YVideoPlayer(el, options) {
    this._player;
    this._elements = {}
    this._eventlist = [];

    this.init = function(id) {
      el = $('#' + id);

      // Init Specific
      this._init_videotag = function(el) {
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

      this._doInitialize = function() {
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
 
      this._init_videotag(el);
      this._doInitialize();
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

    this.init(el);
  }

  // The main video element
  function PlayerElement(yvp, el) {
    this._el = el;
    this._yvp = yvp;

    this.init = function() {
      this._yvp.addEvent('playPause', this.playPause.bind(this));

      this.element()[0].ontimeupdate = function(e) {
        this._yvp.dispatchEvent({type: 'timeupdate', target: this});
      }.bind(this);
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

    this.getData = function(prop) {
      return this.element()[0][prop];
    }

    this.currentTime = function() {
      return this.element()[0].currentTime;
    }

    this.duration = function() {
      return this.element()[0].duration;
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
    inherit(this, arguments);
  }

  function PlayerContainer() {
    inherit(this, arguments);
    
    this.init = function() {
      document.addEventListener(screenfull.raw.fullscreenchange, function() {
        this._toggleFullscreen();
      }.bind(this));
    }

    this._enterFullscreen = function() {
      this.element().addClass('yvp-fullscreen');
    }

    this._exitFullscreen = function() {
      this.element().removeClass('yvp-fullscreen');
    }

    this._toggleFullscreen = function() {
      if(screenfull.isFullscreen) {
        this._enterFullscreen();
      } else {
        this._exitFullscreen();
      }
    }
  }

  function ControlBar() {
    inherit(this, arguments);

    this._playbtn;
    this._progressctrl;
    this._fsbtn;

    this.init = function() {
      // Play Button
      this._playbtn = new PlayBtn(this._yvp, defaults.clsnames.playbtn, this);
      this._playbtn.appendTo(this).init();

      // Progress Control
      this._progressctrl = new ProgressControl(this._yvp, defaults.clsnames.progressctrl, this);
      this._progressctrl.appendTo(this).init();

      // Fullscreen Button
      this._fsbtn = new FullScreenBtn(this._yvp, defaults.clsnames.fullscreenbtn, this);
      this._fsbtn.appendTo(this).init();
    }
  }

  function PlayBtn() {
    inherit(this, arguments);
    this._icon;

    this.init = function() {
      this._icon = new Container(this._yvp, defaults.clsnames.playicon);
      this._icon.appendTo(this);

      console.log(this._yvp);
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

  function ProgressControl() {
    inherit(this, arguments);

    function ProgressHolder() {
      inherit(this, arguments);
    }

    function PlayProgress() {
      inherit(this, arguments);

      this.setProgress = function(percent) {
        this.element().width(percent + "%");
      }
    }

    function ProgressTime() {
      inherit(this, arguments);

      this.init = function() {
        this.element().append($('<span></span>'));
      }

      this.setTime = function(current, duration) {
        this.setHtml('00:04 / 03:44');
      }

      this.setHtml = function(html) {
        this.element().find('span').html(html);
      }
    }
    DOMManipulationFacade(ProgressHolder);
    DOMManipulationFacade(PlayProgress);
    DOMManipulationFacade(ProgressTime);

    this.init = function() {
      this._holder = new ProgressHolder(this._yvp, defaults.clsnames.progressholder);
      this._holder.appendTo(this);

      this._playprogress = new PlayProgress(this._yvp, defaults.clsnames.playprogress);
      this._playprogress.appendTo(this._holder);
      this._playprogress.addClass('fa fa-circle');

      this._progresstime = new ProgressTime(this._yvp, defaults.clsnames.progresstime);
      this._progresstime.appendTo(this._parent).init();

      this.addEvent('timeupdate', function(e) {
        this._handleTimeUpdate(e);
      }.bind(this));
    }

    this._handleTimeUpdate = function(e) {
      var current = e.target.currentTime();
      var duration = e.target.duration();
      var percent = (current / duration) * 100;
      this._playprogress.setProgress(percent);
      this._progresstime.setTime(current, duration);
    }
  }

  function FullScreenBtn() {
    inherit(this, arguments);

    this.init = function() {
      this.element().click(function() {
        this.dispatchEvent({type: "toggleFullscreen"});
      }.bind(this));
    }
  }

  // Gotta wrap 'em all
  function MainWrapper() {
    inherit(this, arguments);

    this.init = function() {
      this.addEvent('toggleFullscreen', this.toggleFullscreen.bind(this));
    }

    this.toggleFullscreen = function() {
      if (screenfull.enabled) {
        if (!screenfull.isFullscreen) {
          screenfull.request(this.element()[0]);
        } else {
          screenfull.exit();
        }
      }
    }
  }

  // Helpers
  function argstoarray(args) {
    args = [].slice.call(args);
    args.unshift(null);
    return args;
  }

  function inherit(obj, args) {
    obj._yvp = args[0];
    obj._el = $('<div class="'+args[1]+'"/>');
    if(args[2]) {
      obj._parent = args[2];
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
    src.prototype.addEvent = function() {
      return this._yvp.addEvent.apply(this._yvp, arguments);
    }
    src.prototype.dispatchEvent = function() {
      return this._yvp.dispatchEvent.apply(this._yvp, arguments);
    }
  }

  DOMManipulationFacade(Container);
  DOMManipulationFacade(ControlBar);
  DOMManipulationFacade(MainWrapper);
  DOMManipulationFacade(PlayerElement);
  DOMManipulationFacade(PlayBtn);
  DOMManipulationFacade(FullScreenBtn);
  DOMManipulationFacade(PlayerContainer);
  DOMManipulationFacade(ProgressControl);

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
